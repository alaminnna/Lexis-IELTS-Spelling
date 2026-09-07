import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { WORDS, CATEGORIES } from "@/data/words"
import type { Word } from "@/types/word"
import { useAppStore } from "@/store/useAppStore"
import { useAudio } from "@/hooks/useAudio"
import { useUiSound } from "@/hooks/useUiSound"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/utils/cn"
import { deriveWordState } from "@/services/adaptiveReview"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import gsap from "gsap"
import { recordMethod, chooseMethodForWord, getWordProfile, explainSelection, type LearningMethod } from "@/services/metaLearning"
import { analyzeMistake } from "@/services/mistakeAnalysis"
import type { LearningFilter, LearningSession } from "@/types/progress"

function spellingBreakdown(word: string): string[] {
  const w = word.toLowerCase()
  const suffixes = ["tion", "sion", "ment", "ness", "able", "ible", "ance", "ence", "ough", "eous", "ious", "ship", "hood"]
  for (const suf of suffixes) if (w.endsWith(suf) && w.length > suf.length + 3) {
    const base = w.slice(0, -suf.length)
    const mid = Math.floor(base.length / 2)
    let split = mid
    for (let i = mid; i < base.length; i++) if (/[aeiou]/.test(base[i]) && i > 2) { split = i; break }
    return [base.slice(0, split).toUpperCase(), base.slice(split).toUpperCase(), suf.toUpperCase()]
  }
  const hasDouble = /(.)\1/.exec(w)
  if (hasDouble && w.length > 7) {
    const idx = hasDouble.index!
    return [w.slice(0, idx).toUpperCase(), w.slice(idx, idx+2).toUpperCase(), w.slice(idx+2).toUpperCase()].filter(Boolean)
  }
  if (w.length <= 6) return [w.toUpperCase()]
  const mid = Math.ceil(w.length / 2)
  return [w.slice(0, mid).toUpperCase(), w.slice(mid).toUpperCase()]
}
function memoryTip(word: string): string | null {
  const w = word.toLowerCase()
  if (/(.)\1/.test(w)) {
    const m = w.match(/(.)\1/g)?.join(", ")
    return `Remember double ${m} — write it as two.`
  }
  if (w.includes("ie") || w.includes("ei")) return "Remember: i before e except after c."
  if (w.endsWith("ance") || w.endsWith("ence")) return "Suffix -ance/-ence: soft 'ns' sound."
  if (w.length > 10) return "Break into chunks and say each part slowly."
  return null
}
function exampleFor(word: Word): string {
  const cat = word.category.toLowerCase()
  const w = word.word
  if (cat.includes("environment")) return `Environmental policies affect "${w}" in many IELTS reports.`
  if (cat.includes("education") || cat.includes("study")) return `The lecture explained "${w}" with clear examples.`
  if (cat.includes("health")) return `A balanced lifestyle supports "${w}" according to the article.`
  if (cat.includes("work")) return `The interview focused on "${w}" in the workplace.`
  if (cat.includes("transport")) return `City planners discussed "${w}" for the new route.`
  return `The listening test used "${w}" in a natural conversation.`
}
function highlightError(correct: string, typed: string): { char: string; isError: boolean }[] {
  const res: { char: string; isError: boolean }[] = []
  for (let i = 0; i < correct.length; i++) {
    const c = correct[i]
    const t = typed[i] ?? ""
    res.push({ char: c, isError: t.toLowerCase() !== c.toLowerCase() })
  }
  return res
}

function buildFilteredWords(filter: LearningFilter, search: string, progressMap: Record<string, any>, envelope: any): Word[] {
  let list = [...WORDS] as Word[]
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(w => w.normalized.includes(q) || w.word.toLowerCase().includes(q))
  }
  if (filter !== "all" && filter !== "smart") {
    list = list.filter(w => {
      const p = progressMap[w.id]
      const state = deriveWordState(p)
      if (filter === "new") return !p || p.attempts === 0
      if (filter === "needsReview") return p && p.wrong >= 2
      if (filter === "weak") return state === "WEAK"
      if (filter === "learning") return state === "LEARNING" || state === "IMPROVING"
      if (filter === "mastered") return state === "MASTERED" || state === "STRONG"
      return true
    })
  }
  if (filter === "smart" && envelope) {
    const scored = list.map(w => {
      const p = progressMap[w.id]
      const state = deriveWordState(p)
      let score = 0
      if (!p) score = 30
      else if (state === "WEAK") score = 50
      else if (state === "LEARNING") score = 40
      else if (state === "IMPROVING") score = 25
      else if (state === "UNSEEN") score = 28
      else if (state === "STRONG") score = 10
      else score = 5
      return { w, score }
    })
    scored.sort((a, b) => b.score - a.score)
    list = scored.map(s => s.w)
  }
  if (search && filter === "smart") list.sort((a, b) => a.word.localeCompare(b.word))
  return list
}

function validateSession(session: LearningSession | null | undefined): LearningSession | null {
  if (!session) return null
  if (session.status === "completed") return session
  if (!Array.isArray(session.wordIds) || session.wordIds.length === 0) return null
  const maxIdx = Math.min(session.currentIndex, session.wordIds.length - 1)
  const validWordIds = session.wordIds.filter(id => WORDS.some(w => w.id === id))
  if (validWordIds.length === 0) return null
  return {
    ...session,
    wordIds: validWordIds,
    currentIndex: Math.min(maxIdx, validWordIds.length - 1),
    completedWordIds: session.completedWordIds?.filter(id => validWordIds.includes(id)) ?? [],
    skippedWordIds: session.skippedWordIds?.filter(id => validWordIds.includes(id)) ?? [],
  }
}

const STEPS = [
  { id: 0, label: "Recognize", short: "1" },
  { id: 1, label: "Meaning", short: "2" },
  { id: 2, label: "Spelling", short: "3" },
  { id: 3, label: "Recall", short: "4" },
] as const

export default function Learning() {
  const envelope = useAppStore(s => s.envelope)
  const { speak } = useAudio()
  const ui = useUiSound()
  const shouldReduceMotion = useReducedMotion()

  const [filter, setFilter] = useState<LearningFilter>("smart")
  const [search, setSearch] = useState("")
  const [sessionSize, setSessionSize] = useState(20)
  const [revealStep, setRevealStep] = useState(0)
  const [recallMode, setRecallMode] = useState<"full" | "partial" | "audio">("full")
  const [recallInput, setRecallInput] = useState("")
  const [recallResult, setRecallResult] = useState<null | boolean>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const startRecallAt = useRef<number>(0)
  const transitioning = useRef(false)

  const [restoring, setRestoring] = useState(true)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [pendingSession, setPendingSession] = useState<LearningSession | null>(null)

  const progressMap = envelope?.wordProgress ?? {}
  const meta = envelope?.metaLearning
  const activeSession = envelope?.activeLearningSession

  useEffect(() => {
    if (!envelope) return
    const validated = validateSession(activeSession)
    if (validated && validated.status === "active" && validated.wordIds.length > 0) {
      setFilter(validated.mode)
      setSearch(validated.filterSearch)
      setSessionSize(validated.sessionSize)
      setPendingSession(validated)
      setShowResumeDialog(true)
    }
    setRestoring(false)
  }, [envelope?.activeLearningSession?.id])

  const handleStartNew = useCallback(() => {
    if (!envelope) return
    const filtered = buildFilteredWords(filter, search, progressMap, envelope)
    const ids = filtered.slice(0, Math.min(sessionSize, filtered.length)).map(w => w.id)
    if (ids.length === 0) return
    useAppStore.getState().createLearningSession(filter, search, sessionSize, ids)
    setShowResumeDialog(false)
    setPendingSession(null)
    setRevealStep(0); setRecallInput(""); setRecallResult(null)
  }, [envelope, filter, search, sessionSize, progressMap])

  const handleResume = useCallback(() => {
    if (!pendingSession) return
    const env = useAppStore.getState().envelope
    if (env) {
      env.activeLearningSession = pendingSession
      useAppStore.setState({ envelope: { ...env } })
      void useAppStore.getState().persist()
    }
    setShowResumeDialog(false)
    setPendingSession(null)
  }, [pendingSession])

  const session = restoring ? null : (envelope?.activeLearningSession ?? null)
  const validSession = validateSession(session)

  const sessionWords = useMemo((): Word[] => {
    if (!validSession || validSession.status === "completed") return []
    return validSession.wordIds.map(id => WORDS.find(w => w.id === id)).filter(Boolean) as Word[]
  }, [validSession?.wordIds, validSession?.status])

  const currentIndex = validSession?.currentIndex ?? 0
  const completedCount = validSession?.completedWordIds?.length ?? 0
  const totalWords = sessionWords.length
  const current: Word | undefined = sessionWords[currentIndex]
  const prog = current ? progressMap[current.id] : undefined
  const tip = current ? memoryTip(current.word) : null
  const profile = current && prog && meta ? getWordProfile(current.id, prog, meta) : null
  const chosenMethod: LearningMethod | null = current && meta ? chooseMethodForWord(current, meta, prog) : null

  const isCompleted = validSession?.status === "completed"
  const isFullyCompleted = isCompleted || (totalWords > 0 && completedCount >= totalWords)

  useEffect(() => {
    if (!cardRef.current || shouldReduceMotion || !current) return
    gsap.fromTo(cardRef.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" })
  }, [current?.id, shouldReduceMotion])

  const handleNext = useCallback(() => {
    if (transitioning.current || !validSession || !current) return
    transitioning.current = true
    const newCompleted = validSession.completedWordIds.includes(current.id)
      ? validSession.completedWordIds
      : [...validSession.completedWordIds, current.id]
    const nextIdx = currentIndex + 1
    if (nextIdx >= totalWords) {
      useAppStore.getState().updateLearningSession({
        currentIndex: nextIdx,
        completedWordIds: newCompleted,
      })
      useAppStore.getState().completeLearningSession()
    } else {
      useAppStore.getState().updateLearningSession({
        currentIndex: nextIdx,
        completedWordIds: newCompleted,
      })
    }
    setRevealStep(0); setRecallInput(""); setRecallResult(null)
    setTimeout(() => { transitioning.current = false }, 50)
  }, [validSession, current, currentIndex, totalWords])

  const handlePrev = useCallback(() => {
    if (transitioning.current || !validSession) return
    transitioning.current = true
    const prevIdx = Math.max(0, currentIndex - 1)
    useAppStore.getState().updateLearningSession({ currentIndex: prevIdx })
    setRevealStep(0); setRecallInput(""); setRecallResult(null)
    setTimeout(() => { transitioning.current = false }, 50)
  }, [validSession, currentIndex])

  const handleRecall = useCallback(() => {
    if (!current || transitioning.current) return
    transitioning.current = true
    const ok = recallInput.trim().toLowerCase() === current.normalized.toLowerCase()
    setRecallResult(ok)
    const timeMs = Date.now() - startRecallAt.current
    if (ok) ui.success(); else ui.error()
    if (envelope && meta) {
      const method: LearningMethod = recallMode === "audio" ? "audio" : recallMode === "partial" ? "chunking" : "recall"
      useAppStore.getState().recordAttempt(current.id, recallInput, current.normalized, timeMs, "normal")
      recordMethod(envelope.metaLearning, current.id, method, ok, timeMs)
      if (!ok) void analyzeMistake(current.normalized, recallInput)
    }
    setTimeout(() => { transitioning.current = false }, 50)
  }, [current, recallInput, recallMode, envelope, meta, ui])

  const startRecall = useCallback((mode: "full" | "partial" | "audio") => {
    setRecallMode(mode)
    setRecallInput("")
    setRecallResult(null)
    startRecallAt.current = Date.now()
    setRevealStep(3)
    ui.pop()
    if (mode === "audio" && current) speak(current.word, false)
  }, [current, speak, ui])

  const handleIKnow = useCallback(() => {
    if (transitioning.current || !validSession || !current) return
    transitioning.current = true
    const newCompleted = validSession.completedWordIds.includes(current.id)
      ? validSession.completedWordIds
      : [...validSession.completedWordIds, current.id]
    const nextIdx = currentIndex + 1
    if (nextIdx >= totalWords) {
      useAppStore.getState().updateLearningSession({
        completedWordIds: newCompleted,
        currentIndex: nextIdx,
      })
      useAppStore.getState().completeLearningSession()
    } else {
      useAppStore.getState().updateLearningSession({
        completedWordIds: newCompleted,
        currentIndex: nextIdx,
      })
    }
    setRevealStep(0); setRecallInput(""); setRecallResult(null)
    setTimeout(() => { transitioning.current = false }, 50)
  }, [validSession, current, currentIndex, totalWords])

  const handleNeedReview = useCallback(() => {
    if (transitioning.current || !validSession || !current) return
    transitioning.current = true
    const newSkipped = validSession.skippedWordIds.includes(current.id)
      ? validSession.skippedWordIds
      : [...validSession.skippedWordIds, current.id]
    void useAppStore.getState().recordAttempt(current.id, "", current.normalized, 900, "normal")
    const nextIdx = currentIndex + 1
    if (nextIdx >= totalWords) {
      useAppStore.getState().updateLearningSession({
        skippedWordIds: newSkipped,
        currentIndex: nextIdx,
      })
      useAppStore.getState().completeLearningSession()
    } else {
      useAppStore.getState().updateLearningSession({
        skippedWordIds: newSkipped,
        currentIndex: nextIdx,
      })
    }
    setRevealStep(0); setRecallInput(""); setRecallResult(null)
    setTimeout(() => { transitioning.current = false }, 50)
  }, [validSession, current, currentIndex, totalWords])

  const handleStartNewAfterComplete = useCallback(() => {
    useAppStore.getState().clearLearningSession()
  }, [])

  const goNextStep = useCallback(() => setRevealStep(s => Math.min(3, s + 1)), [])
  const goPrevStep = useCallback(() => setRevealStep(s => Math.max(0, s - 1)), [])

  if (!envelope) return null
  if (restoring) {
    return (
      <div className="max-w-[760px] mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col gap-3">
          <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-1.5 rounded-full bg-muted animate-pulse" />
          <div className="h-10 rounded-xl border bg-card animate-pulse mt-6" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 lg:px-6 py-6">
      <AnimatePresence>
        {showResumeDialog && pendingSession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold">Resume Learning Session</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You were learning {pendingSession.wordIds.length} words.
                Progress: {pendingSession.completedWordIds.length} / {pendingSession.wordIds.length}.
              </p>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1 rounded-full" onClick={handleResume}>Continue Learning</Button>
                <Button variant="outline" className="flex-1 rounded-full" onClick={handleStartNew}>Start New</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isFullyCompleted && !showResumeDialog && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-semibold">Session Complete!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You completed {completedCount} / {totalWords} words.
              {validSession?.skippedWordIds.length ? ` ${validSession.skippedWordIds.length} skipped.` : ""}
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button className="rounded-full" onClick={handleStartNewAfterComplete}>Start New Session</Button>
              <Button variant="outline" className="rounded-full" onClick={() => { useAppStore.getState().clearLearningSession() }}>Back to Setup</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {!isFullyCompleted && !showResumeDialog && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-[22px] font-[650] tracking-[-0.02em]">Learning</h1>
              <span className="text-xs text-muted-foreground">{completedCount} / {totalWords || 0}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-[hsl(var(--foreground))] transition-all duration-500" style={{ width: `${totalWords ? (completedCount / totalWords) * 100 : 0}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["smart", "needsReview", "new", "weak", "learning", "mastered", "all"] as LearningFilter[]).map(f => (
                <button key={f} onClick={() => {
                  if (validSession && validSession.status === "active" && validSession.completedWordIds.length > 0) {
                    if (!confirm("This will abandon your current session. Start a new one?")) return
                    useAppStore.getState().clearLearningSession()
                  }
                  setFilter(f)
                  ui.softClick()
                }} className={cn("px-2.5 py-1 rounded-full text-xs border capitalize", filter === f ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted")}>{f === "smart" ? "Smart Learning" : f}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
              <select value={sessionSize} onChange={e => {
                if (validSession && validSession.status === "active" && validSession.completedWordIds.length > 0) {
                  if (!confirm("This will abandon your current session. Continue?")) return
                  useAppStore.getState().clearLearningSession()
                }
                setSessionSize(parseInt(e.target.value))
              }} className="h-9 rounded-md border bg-card px-2 text-sm">
                <option value={10}>10</option><option value={20}>20</option><option value={30}>30</option>
              </select>
              {!validSession && (
                <Button size="sm" className="h-9 rounded-md" onClick={handleStartNew}>Start</Button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.slice(0, 8).map(c => (
                <button key={c} onClick={() => setSearch(c)} className="text-[11px] px-2 py-1 rounded-full border bg-card hover:bg-muted">{c}</button>
              ))}
            </div>
          </div>

          {current ? (
            <div ref={cardRef} className="mt-6 rounded-[20px] border bg-card shadow-sm overflow-hidden">
              <div className="px-6 lg:px-8 py-6 text-center border-b bg-[hsl(var(--surface-2))]/50">
                <h2 className="text-[26px] lg:text-[30px] font-[750] tracking-[-0.03em] leading-none">{current.word.toUpperCase()}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{current.category} • {current.difficulty} {prog && <span>• {prog.state}</span>}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button variant="ghost" size="sm" className="rounded-full h-8 gap-1.5" onClick={() => speak(current.word, false)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.08"/></svg> Listen</Button>
                  <Button variant="ghost" size="sm" className="rounded-full h-8 gap-1.5" onClick={() => speak(current.word, true)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 1 1 0 7.07"/></svg> Slow</Button>
                </div>
                {chosenMethod && <p className="mt-2 text-[11px] text-muted-foreground">Best method: <span className="font-medium text-foreground capitalize">{chosenMethod}</span> {profile && profile.spellingRecall < 50 ? "• try chunking" : ""}</p>}
              </div>

              {/* Stepper — horizontal, no vertical expand */}
              <div className="px-4 lg:px-6 py-4 border-b bg-card">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  {STEPS.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[140px]">
                      <button
                        onClick={() => { ui.softClick(); setRevealStep(s.id); setRecallInput(""); setRecallResult(null) }}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border text-xs font-medium transition-colors",
                          revealStep === s.id
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : revealStep > s.id
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900"
                            : "bg-card text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        <span className={cn(
                          "h-5 w-5 rounded-full grid place-items-center text-[10px] font-bold shrink-0",
                          revealStep === s.id ? "bg-background text-foreground" : revealStep > s.id ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {revealStep > s.id ? "✓" : s.short}
                        </span>
                        <span className="hidden sm:inline truncate">{s.label}</span>
                        <span className="sm:hidden truncate text-[11px]">{s.label.slice(0, 3)}</span>
                      </button>
                      {idx < STEPS.length - 1 && (
                        <span className={cn("hidden sm:block h-px flex-1", revealStep > s.id ? "bg-emerald-300" : "bg-border")} />
                      )}
                    </div>
                  ))}
                </div>
                {/* mobile line */}
                <div className="sm:hidden mt-2 flex gap-1 px-1">
                  {STEPS.map((_, i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full", revealStep >= i ? "bg-foreground" : "bg-muted")} />
                  ))}
                </div>
              </div>

              {/* Fixed-height step content — horizontal swipe, not vertical expand */}
              <div className="px-4 lg:px-8 py-6 min-h-[300px] flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={revealStep}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1"
                  >
                    {revealStep === 0 && (
                      <div className="max-w-[520px] mx-auto text-center py-2">
                        <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Step 1 — Recognition</p>
                        <h3 className="mt-2 text-base font-semibold">Do you recognize this word?</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Look at the spelling carefully. Try to picture its shape.</p>
                        <div className="mt-6 flex justify-center gap-2">
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={goPrevStep} disabled>Back</Button>
                          <Button size="sm" className="rounded-full px-6" onClick={() => { ui.pop(); goNextStep() }}>I recognize it →</Button>
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground">Step 1 of 4</p>
                      </div>
                    )}

                    {revealStep === 1 && (
                      <div className="max-w-[520px] mx-auto">
                        <p className="text-[11px] tracking-wide uppercase text-muted-foreground text-center">Step 2 — Meaning</p>
                        <div className="mt-3 rounded-xl border bg-[hsl(var(--surface-2))] p-4">
                          <p className="text-sm"><span className="font-medium">Category:</span> {current.category}</p>
                          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Used in <span className="font-medium text-foreground">{current.category}</span> context. Think about where you'd hear it in IELTS.</p>
                          <p className="mt-2 text-xs text-muted-foreground">Example: <span className="text-foreground italic">"{exampleFor(current)}"</span></p>
                        </div>
                        <div className="mt-4 flex justify-between">
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={goPrevStep}>Back</Button>
                          <Button size="sm" className="rounded-full px-6" onClick={() => { ui.pop(); goNextStep() }}>Next: Spelling →</Button>
                        </div>
                      </div>
                    )}

                    {revealStep === 2 && (
                      <div className="max-w-[520px] mx-auto">
                        <p className="text-[11px] tracking-wide uppercase text-muted-foreground text-center">Step 3 — Spelling pattern</p>
                        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                          {spellingBreakdown(current.word).map((chunk, i) => (
                            <motion.span key={i} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.07 }} className="px-2.5 py-1.5 rounded-lg border bg-card font-[650] tracking-wide text-sm">
                              {chunk}
                            </motion.span>
                          ))}
                        </div>
                        {tip && <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-center"><span className="font-[600]">Remember:</span> {tip}</div>}
                        <div className="mt-4 flex justify-between">
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={goPrevStep}>Back</Button>
                          <Button size="sm" className="rounded-full px-6" onClick={() => { ui.pop(); goNextStep() }}>Next: Recall →</Button>
                        </div>
                      </div>
                    )}

                    {revealStep === 3 && (
                      <div className="max-w-[520px] mx-auto">
                        <p className="text-[11px] tracking-wide uppercase text-muted-foreground text-center">Step 4 — Active recall</p>
                        <div className="mt-3 flex gap-1.5 justify-center">
                          <Button size="sm" variant={recallMode === "full" ? "primary" : "outline"} className="rounded-full h-7 text-xs" onClick={() => startRecall("full")}>Full</Button>
                          <Button size="sm" variant={recallMode === "partial" ? "primary" : "outline"} className="rounded-full h-7 text-xs" onClick={() => startRecall("partial")}>Partial</Button>
                          <Button size="sm" variant={recallMode === "audio" ? "primary" : "outline"} className="rounded-full h-7 text-xs" onClick={() => startRecall("audio")}>Audio</Button>
                        </div>
                        <div className="mt-3 text-center">
                          {recallMode === "partial" ? (
                            <p className="font-mono text-lg tracking-widest">{current.word.split("").map((c,i) => i % 2 === 0 ? c : "_").join(" ")}</p>
                          ) : recallMode === "audio" ? (
                            <p className="text-sm text-muted-foreground">Listen and type the spelling</p>
                          ) : <p className="text-sm text-muted-foreground">Hide spelling — type from memory</p>}
                          <div className="mt-3 flex gap-2">
                            <Input placeholder={recallMode === "partial" ? "Fill missing letters..." : "Type spelling..."} value={recallInput} onChange={e => setRecallInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !transitioning.current && handleRecall()} className="h-9" />
                            <Button size="sm" onClick={handleRecall} disabled={transitioning.current} className="rounded-full h-9">Check</Button>
                          </div>
                          {recallResult !== null && (
                            <div className={cn("mt-3 rounded-lg px-3 py-2 text-sm text-center border", recallResult ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300" : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20")}>
                              {recallResult ? "✓ Correct" : "❌ Review — " + current.word}
                              {!recallResult && (
                                <div className="mt-1.5 flex flex-wrap justify-center gap-0.5">
                                  {highlightError(current.word, recallInput).map((h,i) => (
                                    <span key={i} className={cn("px-1 rounded text-xs", h.isError ? "bg-red-200 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/30")}>{h.char}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex justify-between">
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={goPrevStep}>Back</Button>
                          <span className="text-[11px] text-muted-foreground self-center">Type and check</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Word-level progress kept outside stepper so it doesn't expand */}
                <div className="mt-6 pt-4 border-t">
                  {prog && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg border p-2"><div className="font-semibold">{prog.attempts}</div><div className="text-muted-foreground">Attempts</div></div>
                      <div className="rounded-lg border p-2"><div className="font-semibold">{prog.accuracy.toFixed(0)}%</div><div className="text-muted-foreground">Accuracy</div></div>
                      <div className="rounded-lg border p-2"><div className="font-semibold">{prog.state}</div><div className="text-muted-foreground">State</div></div>
                    </div>
                  )}
                  {profile && profile.spellingRecall < 60 && (
                    <div className="mt-3 rounded-xl border bg-amber-50 dark:bg-amber-950/15 p-3 text-xs">
                      <p className="font-[600]">Learning insight</p>
                      <p className="mt-1 text-muted-foreground">{explainSelection(current, profile)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 lg:px-6 py-3 border-t bg-[hsl(var(--surface-2))] flex gap-2 justify-between">
                <Button variant="ghost" size="sm" className="rounded-full" onClick={handlePrev} disabled={currentIndex === 0 || transitioning.current}>Prev</Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={handleNeedReview} disabled={transitioning.current}>Need Review</Button>
                  <Button size="sm" className="rounded-full" onClick={handleIKnow} disabled={transitioning.current}>I Know This</Button>
                </div>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={handleNext} disabled={transitioning.current || currentIndex + 1 >= totalWords}>Next</Button>
              </div>
            </div>
          ) : (
            !validSession && (
              <Card className="mt-6 p-10 text-center">
                <p className="text-sm text-muted-foreground">Select a filter and click Start to begin your learning session.</p>
              </Card>
            )
          )}
        </>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-xl border p-3"><div className="font-semibold">{Object.values(progressMap).filter(p => p.state === "MASTERED").length}</div><div className="text-muted-foreground">Mastered</div></div>
        <div className="rounded-xl border p-3"><div className="font-semibold">{Object.values(progressMap).filter(p => p.state === "STRONG").length}</div><div className="text-muted-foreground">Strong</div></div>
        <div className="rounded-xl border p-3"><div className="font-semibold">{Object.values(progressMap).filter(p => p.state === "WEAK").length}</div><div className="text-muted-foreground">Needs Review</div></div>
        <div className="rounded-xl border p-3"><div className="font-semibold">{WORDS.length - Object.keys(progressMap).length}</div><div className="text-muted-foreground">New</div></div>
      </div>
    </div>
  )
}
