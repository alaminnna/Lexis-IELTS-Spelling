import { create } from "zustand"
import type { StorageEnvelope, WordProgress, Attempt, Session, Streak, Gamification, Settings, DailyProgress, PracticeMode, MasteryTier, LearningSession, LearningFilter, UserProfile } from "@/types/progress"
import { loadEnvelope, saveEnvelope, importJson, exportJson as exportEnvelope, resetEnvelope, sanitizeName, defaultEnvelope } from "@/services/storage"
import { getTier, computeXp, levelFromXp } from "@/services/scoring"
import { analyzeMistake } from "@/services/mistakeAnalysis"
import { deriveWordState, calculateMastery, calculateNextReviewAt } from "@/services/adaptiveReview"
import { STORAGE_VERSION, BROADCAST_CHANNEL, LS_KEY } from "@/storage/storageKeys"
import { createDefaultMeta } from "@/services/metaLearning"

type AppState = {
  ready: boolean
  storageError: string | null
  envelope: StorageEnvelope | null
  // derived helpers
  init: () => Promise<void>
  persist: () => Promise<void>
  reload: () => Promise<void>

  // word progress helpers
  getProgress: (wordId: string) => WordProgress
  recordAttempt: (wordId: string, typed: string, normalizedExpected: string, responseMs: number, mode: PracticeMode) => { isCorrect: boolean; mistakeType?: string; newScore: number }

  // session
  startSession: (mode: PracticeMode, wordIds: string[]) => Session
  completeSession: (sessionId: string, results: Session["results"]) => void

  // learning session
  createLearningSession: (mode: LearningFilter, filterSearch: string, sessionSize: number, wordIds: string[]) => LearningSession
  updateLearningSession: (patch: Partial<Pick<LearningSession, "currentIndex" | "completedWordIds" | "skippedWordIds">>) => void
  completeLearningSession: () => void
  clearLearningSession: () => void

  // streak/daily
  bumpDaily: (count: number) => void
  updateStreak: () => void

  // settings
  updateSettings: (patch: Partial<Settings>) => void
  setTheme: (t: Settings["theme"]) => void

  // profile / onboarding
  completeOnboarding: (name: string) => Promise<void>
  updateUserProfile: (patch: Partial<Pick<UserProfile, "name">>) => Promise<void>

  // data management
  clearProgress: () => Promise<void>
  clearAllData: () => Promise<void>

  // import/export
  exportJson: () => string
  importJson: (json: string) => Promise<void>
  reset: () => Promise<void>
}

function ensureProgress(env: StorageEnvelope, wordId: string): WordProgress {
  if (env.wordProgress[wordId]) {
    const e = env.wordProgress[wordId] as any
    // migration for older envelopes
    if (e.state === undefined) e.state = deriveWordState(e)
    if (e.accuracy === undefined) e.accuracy = e.attempts ? (e.correct / e.attempts) * 100 : 0
    if (e.consecutiveCorrect === undefined) e.consecutiveCorrect = e.currentStreak || 0
    if (e.consecutiveWrong === undefined) e.consecutiveWrong = e.wrong > 0 && e.currentStreak === 0 ? 1 : 0
    if (e.lastAttemptAt === undefined) e.lastAttemptAt = e.lastPracticedISO
    if (e.lastCorrectAt === undefined) e.lastCorrectAt = null
    if (e.lastWrongAt === undefined) e.lastWrongAt = null
    if (e.nextReviewAt === undefined) e.nextReviewAt = null
    if (e.historicalMastery === undefined) e.historicalMastery = e.masteryScore
    return e
  }
  const p: WordProgress = {
    wordId,
    attempts: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    masteryScore: 50,
    masteryTier: "weak",
    state: "UNSEEN",
    currentStreak: 0,
    bestStreak: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    lastPracticedISO: null,
    lastAttemptAt: null,
    lastCorrectAt: null,
    lastWrongAt: null,
    nextReviewAt: null,
    avgResponseMs: null,
    totalResponseMs: 0,
    mistakeHistogram: { missing: 0, extra: 0, wrong: 0, transposition: 0, repeated: 0, vowel: 0, consonant: 0, multiple: 0 },
    historicalMastery: 50,
  }
  env.wordProgress[wordId] = p
  return p
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

let bc: BroadcastChannel | null = null
let storageListenerAttached = false

function setupMultiTabSync(reload: () => Promise<void>) {
  if (typeof window === "undefined" || storageListenerAttached) return
  storageListenerAttached = true
  // storage event (other tabs)
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) {
      void reload()
    }
  })
  // BroadcastChannel (same origin, more reliable)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(BROADCAST_CHANNEL)
      bc.onmessage = (ev) => {
        if (ev.data?.type === "envelope-updated") void reload()
      }
    }
  } catch {}
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  storageError: null,
  envelope: null,

  async init() {
    let env: StorageEnvelope
    try {
      env = await loadEnvelope()
    } catch (e: any) {
      set({ storageError: "We couldn't access your local data. Your browser may be blocking site storage.", ready: true, envelope: defaultEnvelope() })
      return
    }
    // detect version mismatch already handled in migrate, but if corrupted LS fallback returned default, we still want to show error if original was corrupted
    // we keep storageError null on success
    try {
      // check if raw LS was corrupted and we fell back to default with data loss — detect via localStorage parse failure
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        try { JSON.parse(raw) } catch {
          set({ storageError: "We couldn't access your local data. Your browser may be blocking site storage or data was corrupted. A fresh profile was created." })
        }
      }
    } catch {}
    // migrate: ensure masteryTier + new adaptive fields correct
    for (const p of Object.values(env.wordProgress)) {
      ensureProgress(env, p.wordId)
      p.accuracy = p.attempts ? (p.correct / p.attempts) * 100 : 0
      p.masteryScore = calculateMastery(p)
      p.masteryTier = getTier(p.masteryScore)
      p.state = deriveWordState(p)
      p.historicalMastery = Math.max(p.historicalMastery ?? 0, p.masteryScore)
    }
    set({ envelope: env, ready: true, storageError: get().storageError })
    const theme = env.settings.theme
    applyTheme(theme)
    setupMultiTabSync(() => get().reload())
  },

  async reload() {
    try {
      const env = await loadEnvelope()
      for (const p of Object.values(env.wordProgress)) {
        ensureProgress(env, p.wordId)
        p.accuracy = p.attempts ? (p.correct / p.attempts) * 100 : 0
        p.masteryScore = calculateMastery(p)
        p.masteryTier = getTier(p.masteryScore)
        p.state = deriveWordState(p)
      }
      set({ envelope: { ...env } })
      applyTheme(env.settings.theme)
    } catch {}
  },

  async persist() {
    const { envelope } = get()
    if (envelope) {
      try {
        await saveEnvelope(envelope)
        set({ storageError: null })
      } catch {
        set({ storageError: "We couldn't save your progress. Your browser may be blocking site storage." })
      }
    }
  },

  getProgress(wordId: string) {
    const env = get().envelope
    if (!env) throw new Error("not ready")
    return ensureProgress(env, wordId)
  },

  recordAttempt(wordId: string, typed: string, normalizedExpected: string, responseMs: number, mode: PracticeMode) {
    const env = get().envelope!
    const prog = ensureProgress(env, wordId)
    const normalizedTyped = typed.toLowerCase().trim().replace(/\s+/g, " ")
    const { isCorrect, mistakeType } = analyzeMistake(normalizedExpected, typed)

    const nowISO = new Date().toISOString()
    prog.attempts++
    prog.lastAttemptAt = nowISO
    prog.lastPracticedISO = nowISO
    if (isCorrect) {
      prog.correct++
      prog.currentStreak++
      prog.bestStreak = Math.max(prog.bestStreak, prog.currentStreak)
      prog.consecutiveCorrect = (prog.consecutiveCorrect || 0) + 1
      prog.consecutiveWrong = 0
      prog.lastCorrectAt = nowISO
    } else {
      prog.wrong++
      prog.currentStreak = 0
      prog.consecutiveWrong = (prog.consecutiveWrong || 0) + 1
      prog.consecutiveCorrect = 0
      prog.lastWrongAt = nowISO
      if (mistakeType) {
        prog.mistakeHistogram[mistakeType as keyof typeof prog.mistakeHistogram]++
        prog.lastMistakeType = mistakeType as any
      }
    }
    prog.accuracy = prog.attempts ? (prog.correct / prog.attempts) * 100 : 0
    prog.totalResponseMs += responseMs
    prog.avgResponseMs = Math.round(prog.totalResponseMs / prog.attempts)
    // mastery via weighted formula
    prog.masteryScore = calculateMastery(prog)
    prog.masteryTier = getTier(prog.masteryScore)
    prog.state = deriveWordState(prog)
    prog.historicalMastery = Math.max(prog.historicalMastery ?? 0, prog.masteryScore)
    // decay: if mastered but long gap, keep historical but allow current to decay slightly via recency in mastery calc (already -8)
    prog.nextReviewAt = calculateNextReviewAt(prog, isCorrect)

    const attempt: Attempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wordId,
      timestampISO: new Date().toISOString(),
      typed,
      normalizedTyped,
      isCorrect,
      mistakeType: mistakeType as any,
      responseMs,
      mode,
    }
    env.attempts.push(attempt)
    if (env.attempts.length > 5000) env.attempts = env.attempts.slice(-5000)

    // daily
    const today = todayISO()
    const daily = env.dailyProgress[today] || { dateISO: today, count: 0, goal: env.settings.dailyGoal }
    daily.count++
    env.dailyProgress[today] = daily

    // streak
    get().updateStreak()

    set({ envelope: { ...env } })
    void get().persist()

    return { isCorrect, mistakeType, newScore: prog.masteryScore }
  },

  startSession(mode: PracticeMode, wordIds: string[]) {
    const env = get().envelope!
    const s: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode,
      startedAt: new Date().toISOString(),
      endedAt: null,
      wordIds,
      results: [],
      correctCount: 0,
      wrongCount: 0,
      avgResponseMs: null,
      xpEarned: 0,
    }
    env.sessions.push(s)
    env.streak.totalSessions++
    set({ envelope: { ...env } })
    void get().persist()
    return s
  },

  completeSession(sessionId: string, results: Session["results"]) {
    const env = get().envelope!
    const s = env.sessions.find(x => x.id === sessionId)
    if (!s) return
    s.results = results
    s.correctCount = results.filter(r => r.correct).length
    s.wrongCount = results.length - s.correctCount
    const avg = results.length ? Math.round(results.reduce((sum, r) => sum + r.responseMs, 0) / results.length) : null
    s.avgResponseMs = avg
    s.endedAt = new Date().toISOString()
    s.xpEarned = computeXp(results.map(r => ({ correct: r.correct, responseMs: r.responseMs })))
    env.gamification.xp += s.xpEarned
    env.gamification.level = levelFromXp(env.gamification.xp)
    // personal bests
    const acc = results.length ? (s.correctCount / results.length) * 100 : 0
    if (acc > env.gamification.personalBests.bestAccuracy) env.gamification.personalBests.bestAccuracy = acc
    if (s.correctCount > env.gamification.personalBests.bestStreak) env.gamification.personalBests.bestStreak = s.correctCount
    if (avg != null && (env.gamification.personalBests.fastestAvgMs == null || avg < env.gamification.personalBests.fastestAvgMs)) {
      env.gamification.personalBests.fastestAvgMs = avg
    }
    // achievements
    checkAchievements(env)
    set({ envelope: { ...env } })
    void get().persist()
  },

  createLearningSession(mode: LearningFilter, filterSearch: string, sessionSize: number, wordIds: string[]) {
    const env = get().envelope!
    const now = new Date().toISOString()
    const s: LearningSession = {
      id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode,
      filterSearch,
      sessionSize,
      wordIds,
      currentIndex: 0,
      completedWordIds: [],
      skippedWordIds: [],
      startedAt: now,
      lastActiveAt: now,
      status: "active",
      sessionVersion: 1,
    }
    env.activeLearningSession = s
    set({ envelope: { ...env } })
    void get().persist()
    return s
  },

  updateLearningSession(patch) {
    const env = get().envelope!
    const s = env.activeLearningSession
    if (!s || s.status !== "active") return
    if (patch.currentIndex !== undefined) s.currentIndex = patch.currentIndex
    if (patch.completedWordIds !== undefined) s.completedWordIds = patch.completedWordIds
    if (patch.skippedWordIds !== undefined) s.skippedWordIds = patch.skippedWordIds
    s.lastActiveAt = new Date().toISOString()
    set({ envelope: { ...env } })
    void get().persist()
  },

  completeLearningSession() {
    const env = get().envelope!
    const s = env.activeLearningSession
    if (!s) return
    s.status = "completed"
    s.lastActiveAt = new Date().toISOString()
    set({ envelope: { ...env } })
    void get().persist()
  },

  clearLearningSession() {
    const env = get().envelope!
    env.activeLearningSession = null
    set({ envelope: { ...env } })
    void get().persist()
  },

  bumpDaily(count: number) {
    const env = get().envelope!
    const today = todayISO()
    const daily = env.dailyProgress[today] || { dateISO: today, count: 0, goal: env.settings.dailyGoal }
    daily.count += count
    env.dailyProgress[today] = daily
    set({ envelope: { ...env } })
  },

  updateStreak() {
    const env = get().envelope!
    const today = todayISO()
    const last = env.streak.lastPracticeDateISO
    if (last === today) return // already counted today
    const yesterday = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    })()
    if (last === yesterday) {
      env.streak.current++
    } else if (last === null || last !== today) {
      // if gap >1 day, reset to 1 if not already today
      if (!last) env.streak.current = 1
      else {
        // check if gap >1
        const gap = (new Date(today).getTime() - new Date(last).getTime()) / (86400000)
        if (gap > 1) env.streak.current = 1
        else env.streak.current++
      }
    }
    env.streak.longest = Math.max(env.streak.longest, env.streak.current)
    env.streak.lastPracticeDateISO = today
    if (!env.streak.history.includes(today)) {
      env.streak.history.push(today)
      env.streak.practiceDays = env.streak.history.length
    }
  },

  updateSettings(patch) {
    const env = get().envelope!
    env.settings = { ...env.settings, ...patch }
    if (patch.theme) applyTheme(patch.theme)
    set({ envelope: { ...env } })
    void get().persist()
  },
  setTheme(t) { get().updateSettings({ theme: t }) },

  async completeOnboarding(name: string) {
    const trimmed = sanitizeName(name.trim())
    if (!trimmed) throw new Error("Name is required")
    const env = get().envelope!
    env.userProfile.name = trimmed
    env.userProfile.onboardingCompleted = true
    env.userProfile.updatedAt = new Date().toISOString()
    if (!env.userProfile.createdAt) env.userProfile.createdAt = new Date().toISOString()
    set({ envelope: { ...env } })
    await get().persist()
  },

  async updateUserProfile(patch) {
    const env = get().envelope!
    if (patch.name !== undefined) {
      const trimmed = sanitizeName(patch.name.trim())
      if (!trimmed) throw new Error("Name is required")
      env.userProfile.name = trimmed
      env.userProfile.updatedAt = new Date().toISOString()
    }
    set({ envelope: { ...env } })
    await get().persist()
  },

  async clearProgress() {
    const env = get().envelope!
    // clear practice history
    env.attempts = []
    env.sessions = []
    env.dailyProgress = {}
    env.wordProgress = {}
    env.streak = { current: 0, longest: 0, lastPracticeDateISO: null, practiceDays: 0, totalSessions: 0, history: [] }
    env.gamification = { xp: 0, level: 1, achievements: [], personalBests: { bestAccuracy: 0, bestStreak: 0, fastestAvgMs: null } }
    env.metaLearning = createDefaultMeta()
    env.activeLearningSession = null
    // DO NOT clear userProfile.name, userWords, hiddenWordIds, settings
    set({ envelope: { ...env } })
    await get().persist()
  },

  async clearAllData() {
    const def = defaultEnvelope()
    // preserve nothing — full reset to onboarding
    // ensure default has fresh createdAt but onboarding false
    def.userProfile.onboardingCompleted = false
    def.userProfile.name = ""
    set({ envelope: def, ready: true })
    await saveEnvelope(def)
    // also clear any Broadcast will happen via saveEnvelope
    applyTheme(def.settings.theme)
  },

  exportJson() {
    const env = get().envelope!
    return exportEnvelope(env)
  },
  async importJson(json: string) {
    const parsed = importJson(json)
    // ensure Tier correct
    for (const p of Object.values(parsed.wordProgress)) p.masteryTier = getTier(p.masteryScore)
    set({ envelope: parsed })
    await saveEnvelope(parsed)
    applyTheme(parsed.settings.theme)
  },
  async reset() {
    const def = await resetEnvelope()
    set({ envelope: def })
    applyTheme(def.settings.theme)
  },
}))

function checkAchievements(env: StorageEnvelope) {
  const has = (id: string) => env.gamification.achievements.some(a => a.id === id)
  const unlock = (id: any) => { if (!has(id)) env.gamification.achievements.push({ id, unlockedAt: new Date().toISOString() }) }
  if (env.attempts.length >= 100 && !has("first100")) unlock("first100")
  if (env.streak.current >= 7 && !has("streak7")) unlock("streak7")
  if (env.streak.current >= 20 && !has("streak20")) unlock("streak20")
  const mastered = Object.values(env.wordProgress).filter(p => p.masteryScore >= 95).length
  if (mastered >= 500 && !has("master500")) unlock("master500")
  if (env.attempts.length >= 1000 && !has("practice1000")) unlock("practice1000")
  // perfect session check is done per session, but we can generic
  if (env.sessions.some(s => s.correctCount > 0 && s.wrongCount === 0 && s.wordIds.length >= 10) && !has("perfect")) unlock("perfect")
}

function applyTheme(theme: string) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = theme === "dark" || (theme === "system" && prefersDark)
  root.classList.toggle("dark", isDark)
}
