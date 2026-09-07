import { useEffect, useRef, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import gsap from "gsap"
import { WORDS } from "@/data/words"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/utils/cn"
import { analyzeMistake, mistakeLabel } from "@/services/mistakeAnalysis"
import { getTier, tierColor } from "@/services/scoring"
import { selectNextWords } from "@/services/adaptiveReview"
import { useAudio } from "@/hooks/useAudio"
import { useUiSound } from "@/hooks/useUiSound"
import type { PracticeMode } from "@/types/progress"

// State machine — clean, predictable
type PracticeState = "typing" | "correct" | "wrong" | "revealed"

export default function Practice() {
  const envelope = useAppStore(s => s.envelope)
  const recordAttempt = useAppStore(s => s.recordAttempt)
  const startSession = useAppStore(s => s.startSession)
  const completeSession = useAppStore(s => s.completeSession)
  const { speak } = useAudio()
  const ui = useUiSound()
  const shouldReduceMotion = useReducedMotion()

  const sessionLength = envelope?.settings.sessionLength ?? 20
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ALLOWED_MODES = ["normal","listen","mistakes","weak","quick10","challenge50","random","smart"] as const
  const modeParam = searchParams.get("mode") as PracticeMode | null
  const activeMode: PracticeMode = modeParam && (ALLOWED_MODES as readonly string[]).includes(modeParam)
    ? (modeParam as PracticeMode)
    : (envelope?.settings.defaultMode ?? "listen")

  const [sessionKey, setSessionKey] = useState(0)
  const [wordList, setWordList] = useState(() => {
    if (!envelope) return [] as typeof WORDS
    return selectNextWords(WORDS, envelope.wordProgress, activeMode, sessionLength, envelope?.settings.adaptiveEnabled ?? true)
  })

  useEffect(() => {
    if (!envelope) return
    const list = selectNextWords(WORDS, envelope.wordProgress, activeMode, sessionLength, envelope.settings.adaptiveEnabled)
    setWordList(list)
  }, [sessionKey, sessionLength, envelope?.settings.adaptiveEnabled, activeMode])

  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState("")
  const [state, setState] = useState<PracticeState>("typing")
  const [showWord, setShowWord] = useState(false)
  const [feedback, setFeedback] = useState<{ mistakeType?: string; yourAnswer: string; correct: string } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSlowPlaying, setIsSlowPlaying] = useState(false)
  const [startedAt, setStartedAt] = useState<number>(Date.now())
  const [results, setResults] = useState<{ wordId: string; correct: boolean; mistakeType?: any; responseMs: number }[]>([])
  const resultsRef = useRef(results)
  useEffect(() => { resultsRef.current = results }, [results])

  // reset session progress when mode changes
  useEffect(() => {
    setIdx(0)
    setTyped("")
    setState("typing")
    setShowWord(false)
    setFeedback(null)
    setResults([])
    resultsRef.current = []
    setCompleted(false)
    setSessionId(null)
  }, [activeMode])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [completed, setCompleted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const word = wordList[idx] ?? null

  useEffect(() => {
    if (!envelope || !wordList.length || sessionId) return
    const s = startSession(activeMode, wordList.map(w => w.id))
    setSessionId(s.id)
  }, [envelope, wordList, sessionId, startSession, activeMode])

  const enabled = envelope?.settings.soundEnabled ?? true

  useEffect(() => setStartedAt(Date.now()), [idx])
  useEffect(() => { inputRef.current?.focus() }, [word?.id, state])

  // auto-play on word change (IELTS listening)
  useEffect(() => {
    if (!word || !enabled || !envelope?.settings.autoPlay) return
    const t = setTimeout(() => handlePlay(false), 350)
    return () => clearTimeout(t)
  }, [word?.id])

  // progress — GPU scaleX
  useEffect(() => {
    if (!progressRef.current) return
    const pct = wordList.length ? (idx + (state !== "typing" ? 1 : 0)) / wordList.length : 0
    if (shouldReduceMotion) {
      progressRef.current.style.transform = `scaleX(${pct})`
      return
    }
    gsap.to(progressRef.current, { scaleX: pct, duration: 0.6, ease: "power3.out", overwrite: true })
  }, [idx, state, wordList.length, shouldReduceMotion])

  // card entrance
  useEffect(() => {
    if (!cardRef.current || shouldReduceMotion) return
    gsap.fromTo(cardRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", overwrite: true })
  }, [word?.id, shouldReduceMotion])

  const handlePlay = async (slow = false) => {
    if (!word) return
    if (slow) setIsSlowPlaying(true)
    else setIsPlaying(true)
    ui.softClick()
    await speak(word.word, slow)
    setIsPlaying(false)
    setIsSlowPlaying(false)
    inputRef.current?.focus()
  }

  const handleCheck = () => {
    if (!word || !typed.trim()) return
    // if already wrong/revealed and typing again, this is a retry of same word — clear previous feedback and re-check
    const elapsed = Date.now() - startedAt
    const res = recordAttempt(word.id, typed, word.normalized, elapsed, activeMode)
    const a = analyzeMistake(word.normalized, typed)
    if (res.isCorrect) {
      setState("correct")
      const ns = streak + 1
      setStreak(ns)
      ui.success()
      // subtle success handled via motion, not whole screen
      if (!shouldReduceMotion && cardRef.current) gsap.fromTo(cardRef.current, { scale: 0.99 }, { scale: 1, duration: 0.28, ease: "back.out(1.2)" })
      setFeedback({ yourAnswer: typed, correct: word.word, mistakeType: a.mistakeType })
      setResults(r => {
        const next = [...r, { wordId: word.id, correct: true, mistakeType: a.mistakeType, responseMs: elapsed }]
        resultsRef.current = next
        return next
      })
    } else {
      setState("wrong")
      setStreak(0)
      ui.error()
      if (!shouldReduceMotion && cardRef.current) gsap.fromTo(cardRef.current, { x: -2 }, { x: 0, duration: 0.3, ease: "power2.out" })
      setFeedback({ yourAnswer: typed, correct: word.word, mistakeType: a.mistakeType })
      setResults(r => {
        const next = [...r, { wordId: word.id, correct: false, mistakeType: a.mistakeType, responseMs: elapsed }]
        resultsRef.current = next
        return next
      })
    }
  }

  const handleNext = () => {
    if (idx + 1 >= wordList.length) {
      if (sessionId) completeSession(sessionId, resultsRef.current)
      setCompleted(true)
      ui.success()
      return
    }
    // ultra smooth — feels like mind happy, spring-like, no flash
    if (!shouldReduceMotion && cardRef.current) {
      const el = cardRef.current
      gsap.to(el, {
        opacity: 0, y: -6, scale: 0.985, duration: 0.24, ease: "power2.in",
        onComplete: () => {
          setIdx(i => i + 1)
          setTyped("")
          setShowWord(false)
          setState("typing")
          setFeedback(null)
          gsap.fromTo(el, { opacity: 0, y: 10, scale: 0.99 }, { opacity: 1, y: 0, scale: 1, duration: 0.44, ease: [0.16, 1, 0.3, 1] as any })
        }
      })
    } else {
      setIdx(i => i + 1)
      setTyped("")
      setShowWord(false)
      setState("typing")
      setFeedback(null)
    }
  }

  const handleView = () => {
    setState("revealed")
    ui.pop()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // If in wrong/revealed and user starts typing again → new attempt for SAME word (spec: clear previous answer)
    if (state === "wrong" || state === "revealed") {
      setState("typing")
      setFeedback(null)
      // val is old typed + new char (e.g. "s" -> "sa"), we want only the new char(s) as fresh attempt
      const added = val.startsWith(typed) ? val.slice(typed.length) : val
      const fresh = added || val.slice(-1) || ""
      // If backspace/delete, keep the truncated val
      if (val.length < typed.length) {
        setTyped(val)
        ui.typeBackspace()
      } else {
        setTyped(fresh)
        if (fresh) for (const ch of fresh) ui.typeTick(ch)
      }
      return
    }
    // normal typing tick
    if (val.length > typed.length) {
      const added = val.slice(typed.length)
      for (const ch of added) ui.typeTick(ch)
    } else if (val.length < typed.length) {
      ui.typeBackspace()
    }
    setTyped(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      ui.typeEnter()
      if (state === "typing" || state === "wrong") handleCheck()
      else if (state === "correct" || state === "revealed") handleNext()
    }
  }

  // Keyboard-first shortcuts per prompt: Enter Submit/Next, Space Play, R Slow, N Next, Esc Exit (plus Ctrl+Space)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      const isInputFocused = document.activeElement === inputRef.current

      // Ctrl/Cmd + Space → Play even while typing (prevents inserting space)
      if ((e.ctrlKey || e.metaKey) && (e.code === "Space" || e.key === " ")) {
        e.preventDefault()
        if (word) handlePlay(false)
        return
      }
      // Ctrl/Cmd + Enter → Show word
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (state === "typing") {
          setState("revealed")
          setShowWord(true)
          setFeedback({ yourAnswer: typed, correct: word?.word || "", mistakeType: undefined })
          ui.pop()
        }
        return
      }
      // Esc → Exit practice → dashboard (since / is now landing)
      if (e.key === "Escape") {
        e.preventDefault()
        navigate("/dashboard")
        return
      }
      // N → Next word (when not typing in input)
      if ((e.key === "n" || e.key === "N") && !isTyping) {
        e.preventDefault()
        if (state === "correct" || state === "revealed" || state === "wrong") handleNext()
        else if (state === "typing" && typed.trim()) handleCheck()
        else handleNext()
        return
      }
      // R → Slow replay (when not typing)
      if ((e.key === "r" || e.key === "R") && !isTyping) {
        e.preventDefault()
        if (word) handlePlay(true)
        return
      }
      // Space → Play normal pronunciation (when not typing)
      if (e.code === "Space" && !isTyping) {
        e.preventDefault()
        if (word) handlePlay(false)
        return
      }
      if (e.key === "Enter" && !isInputFocused) {
        e.preventDefault()
        if (state === "typing" || state === "wrong") {
          if (typed.trim()) handleCheck()
        } else {
          handleNext()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [state, word, typed, navigate])

  if (!envelope) return null
  if (!wordList.length) {
    return (
      <div className="practice-fit max-w-[720px] mx-auto px-4 flex flex-col justify-center items-center text-center">
        <p className="text-sm text-muted-foreground">No words available.</p>
        <Button className="mt-4" onClick={() => setSessionKey(k => k + 1)}>Start practice</Button>
      </div>
    )
  }

  if (completed) {
    const correct = results.filter(r => r.correct).length
    const wrong = results.length - correct
    const acc = results.length ? Math.round((correct / results.length) * 100) : 0
    const avg = results.length ? Math.round(results.reduce((s, r) => s + r.responseMs, 0) / results.length) : 0
    return (
      <div className="practice-fit max-w-[720px] mx-auto px-4 flex flex-col justify-center">
        <div className="rounded-[24px] border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500 text-white grid place-items-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Session complete</h2>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{activeMode} • {results.length} words • {acc}%</p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl border p-4"><div className="text-2xl font-semibold">{correct}</div><div className="text-xs text-muted-foreground">Correct</div></div>
            <div className="rounded-xl border p-4"><div className="text-2xl font-semibold">{wrong}</div><div className="text-xs text-muted-foreground">Wrong</div></div>
            <div className="rounded-xl border p-4"><div className="text-2xl font-semibold">{avg}ms</div><div className="text-xs text-muted-foreground">Avg</div></div>
          </div>
          <div className="mt-6 flex gap-2 justify-center">
            <Button onClick={() => { setIdx(0); setResults([]); resultsRef.current = []; setCompleted(false); setTyped(""); setState("typing"); setShowWord(false); setFeedback(null); setSessionId(null); setSessionKey(k => k + 1) }}>Practice again</Button>
            <Button variant="outline" onClick={() => setSessionKey(k => k + 1)}>New set</Button>
          </div>
        </div>
      </div>
    )
  }

  const tier = word ? getTier(envelope.wordProgress[word.id]?.masteryScore ?? 50) : "learning"
  const totalWords = WORDS.length

  return (
    <div className="practice-fit max-w-[640px] mx-auto px-4 lg:px-6 flex flex-col justify-center overflow-hidden">
      {/* Top — progress only, minimal */}
      <div className="shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px]">
          <span className="tabular-nums text-muted-foreground font-medium">Word {idx + 1} / {totalWords} <span className="ml-2 text-[11px] capitalize px-1.5 py-0.5 rounded border bg-card">{activeMode}</span></span>
          <span className="text-[11px] tracking-wide text-muted-foreground hidden sm:inline-flex items-center gap-1.5"><span className="h-1 w-8 rounded-full bg-muted hidden sm:block overflow-hidden"><span className="block h-full bg-[hsl(var(--accent))] progress-tier-indicator" /></span> {tier}</span>
        </div>
        <div className="h-[2.5px] rounded-full bg-muted overflow-hidden">
          <div ref={progressRef} className="h-full bg-[hsl(var(--accent))] origin-left progress-scale" style={{ "--progress-scale-x": `${wordList.length ? (idx + (state !== "typing" ? 1 : 0)) / wordList.length : 0}` } as React.CSSProperties} />
        </div>
      </div>

      {/* Center — audio + input only */}
      <div ref={cardRef} className="mt-6 flex-1 flex flex-col justify-center min-h-0">
        <div className="text-center">
          {/* Audio */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handlePlay(false)}
              aria-label="Play pronunciation"
              className="group relative h-[96px] w-[96px] rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 will-change-transform"
            >
              {/* sound waves — only when playing */}
              <AnimatePresence>
                {(isPlaying || isSlowPlaying) && !shouldReduceMotion && (
                  <>
                    <motion.span initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} className="absolute inset-0 rounded-full border border-foreground/20" />
                    <motion.span initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1.55, opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3, ease: "easeOut" }} className="absolute inset-0 rounded-full border border-foreground/15" />
                  </>
                )}
              </AnimatePresence>
              <span className={cn("relative", (isPlaying || isSlowPlaying) && "animate-pulse")}>
                {(isPlaying || isSlowPlaying) ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" className="animate-[soundbar_0.5s_ease-in-out_infinite]" />
                    <rect x="11" y="4" width="3" height="16" rx="1" fill="currentColor" className="animate-[soundbar_0.5s_ease-in-out_0.15s_infinite]" />
                    <rect x="15" y="7" width="3" height="10" rx="1" fill="currentColor" className="animate-[soundbar_0.5s_ease-in-out_0.3s_infinite]" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="translate-x-[1.5px]"><path d="M8 5.14v14l11-7z"/></svg>
                )}
              </span>
            </button>
            <p className="mt-3 text-[11px] tracking-[0.14em] uppercase font-[600] text-muted-foreground h-[14px]">
              <AnimatePresence mode="wait">
                {(isPlaying || isSlowPlaying) ? (
                  <motion.span key="playing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="inline-flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Playing{isSlowPlaying ? " slowly" : ""}...
                  </motion.span>
                ) : (
                  <motion.span key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Listen</motion.span>
                )}
              </AnimatePresence>
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs gap-1.5" onClick={() => handlePlay(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.08"/></svg> Replay
              </Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs gap-1.5" onClick={() => handlePlay(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 1 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> Slow
              </Button>
              {state === "typing" && (
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs gap-1.5 border border-dashed hover:border-foreground/30" onClick={() => { setState("revealed"); setShowWord(true); setFeedback({ yourAnswer: typed, correct: word?.word || "", mistakeType: undefined }); ui.pop() }} aria-label="Show word" title="Ctrl+Enter to show">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Show <span className="hidden sm:inline text-[10px] opacity-60">Ctrl+Enter</span>
                </Button>
              )}
            </div>
            <span className={cn("mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-wide", tierColor(tier))}>{tier}</span>
          </div>

          {/* Input */}
          <div className="mt-8 max-w-[520px] mx-auto w-full">
            <div className="relative">
              <input
                ref={inputRef}
                value={typed}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type what you hear..."
                readOnly={state === "correct"}
                className={cn(
                  "w-full h-[58px] rounded-full border bg-card px-6 text-center text-[18px] font-[500] tracking-[-0.015em] placeholder:text-muted-foreground/40 shadow-sm transition-all duration-200",
                  "focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10",
                  (state === "wrong" || state === "revealed") && "border-red-200 focus:border-red-300 focus:ring-red-100",
                  state === "correct" && "border-emerald-200 bg-emerald-50/50"
                )}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Spelling input"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              {state === "typing" && "Press Enter to check"}
              {state === "wrong" && "Type again or press Enter for next"}
              {state === "revealed" && "Press Enter for next word"}
              {state === "correct" && "Press Enter for next word"}
            </p>

            {/* Feedback */}
            <AnimatePresence mode="wait">
              {state === "correct" && feedback && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 dark:bg-emerald-950/15 px-5 py-4 text-center backdrop-blur">
                  <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <span className="h-7 w-7 rounded-full bg-emerald-500 text-white grid place-items-center shadow-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
                    <span className="font-[650] tracking-tight">Correct</span>
                    <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500 text-white">+10 XP</span>
                  </div>
                  {streak >= 2 && <p className="mt-1.5 text-xs text-emerald-700/70"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-text-bottom mr-0.5" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>{streak}× streak — keep going!</p>}
                </motion.div>
              )}
              {state === "wrong" && feedback && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4 rounded-2xl border border-red-200 bg-red-50/60 dark:bg-red-950/20 px-5 py-4 text-center">
                  <p className="text-sm font-[600] text-red-600 dark:text-red-300">Not quite</p>
                  <div className="mt-3">
                    <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Your answer</p>
                    <p className="mt-1 text-[15px] font-[500] text-foreground break-all">{feedback.yourAnswer}</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={handleView}>View spelling</Button>
                  <p className="mt-2 text-[11px] text-muted-foreground">Type again or press Enter</p>
                </motion.div>
              )}
              {state === "revealed" && feedback && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border bg-card px-5 py-5 text-center shadow-sm">
                  <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Correct spelling</p>
                  <h2 className="mt-2 inline-flex flex-wrap justify-center gap-[2px] text-[32px] font-[750] tracking-[-0.03em] leading-none whitespace-nowrap">
                    {feedback.correct.split("").map((ch, i) => (
                      <motion.span key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.022, duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className="inline-block">
                        {ch === " " ? "\u00A0" : ch}
                      </motion.span>
                    ))}
                  </h2>
                  {feedback.mistakeType && <Badge className="mt-3 border bg-muted text-[11px]">{mistakeLabel(feedback.mistakeType as any)}</Badge>}
                  <p className="mt-3 text-xs text-muted-foreground">Press Enter for next word</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex justify-center">
              {state === "typing" ? (
                <Button size="lg" className="rounded-full min-w-[160px] h-11" onClick={handleCheck} disabled={!typed.trim()}>Check</Button>
              ) : state === "correct" || state === "revealed" ? (
                <Button size="lg" className="rounded-full min-w-[160px] h-11" onClick={handleNext}>Next <span className="ml-1 opacity-60">↵</span></Button>
              ) : (
                <Button size="lg" variant="outline" className="rounded-full min-w-[160px] h-11" onClick={handleNext}>Next <span className="ml-1 opacity-60">↵</span></Button>
              )}
            </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                <span className="hidden sm:inline">Ctrl + Space to play • Ctrl + Enter to show • </span>Press Enter to {state === "typing" ? "check" : "continue"}
              </p>
          </div>
        </div>
      </div>
    </div>
  )
}
