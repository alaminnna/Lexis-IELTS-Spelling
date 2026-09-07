import type { Word } from "./word"
import type { MetaLearningStore } from "@/services/metaLearning"
export type MasteryTier = "critical" | "weak" | "learning" | "strong" | "mastered"
export type MistakeType =
  | "missing"
  | "extra"
  | "wrong"
  | "transposition"
  | "repeated"
  | "vowel"
  | "consonant"
  | "multiple"

export type WordState = "UNSEEN" | "LEARNING" | "WEAK" | "IMPROVING" | "STRONG" | "MASTERED"

export type WordProgress = {
  wordId: string
  attempts: number
  correct: number
  wrong: number
  accuracy: number // 0-100 derived
  masteryScore: number // 0..100
  masteryTier: MasteryTier
  state: WordState
  currentStreak: number
  bestStreak: number
  consecutiveCorrect: number
  consecutiveWrong: number
  lastPracticedISO: string | null
  lastAttemptAt: string | null
  lastCorrectAt: string | null
  lastWrongAt: string | null
  nextReviewAt: string | null // ISO for spaced review
  avgResponseMs: number | null
  totalResponseMs: number
  mistakeHistogram: Record<MistakeType, number>
  lastMistakeType?: MistakeType
  // lightweight decay tracking
  historicalMastery: number // max achieved
}

export type Attempt = {
  id: string
  wordId: string
  timestampISO: string
  typed: string
  normalizedTyped: string
  isCorrect: boolean
  mistakeType?: MistakeType
  responseMs: number
  mode: PracticeMode
}

export type PracticeMode =
  | "normal"
  | "listen"
  | "mistakes"
  | "weak"
  | "quick10"
  | "challenge50"
  | "random"
  | "smart"

export type Session = {
  id: string
  mode: PracticeMode
  startedAt: string
  endedAt: string | null
  wordIds: string[]
  results: { wordId: string; correct: boolean; mistakeType?: MistakeType; responseMs: number }[]
  correctCount: number
  wrongCount: number
  avgResponseMs: number | null
  xpEarned: number
}

export type Streak = {
  current: number
  longest: number
  lastPracticeDateISO: string | null // YYYY-MM-DD
  practiceDays: number
  totalSessions: number
  history: string[] // YYYY-MM-DD
}

export type Settings = {
  theme: "light" | "dark" | "system"
  soundEnabled: boolean
  volume: number // 0..1
  autoPlay: boolean
  slowRate: boolean
  dailyGoal: number
  defaultMode: PracticeMode
  adaptiveEnabled: boolean
  sessionLength: number // default 20
}

export type DailyProgress = { dateISO: string; count: number; goal: number }

export type AchievementId =
  | "first100"
  | "streak7"
  | "perfect"
  | "master500"
  | "streak20"
  | "practice1000"
  | "firstMistake"
  | "goal7"

export type Gamification = {
  xp: number
  level: number
  achievements: { id: AchievementId; unlockedAt: string }[]
  personalBests: { bestAccuracy: number; bestStreak: number; fastestAvgMs: number | null }
}

export type UserProfile = {
  id: string
  name: string
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string | null
}

export type LearningFilter = "all" | "new" | "needsReview" | "weak" | "learning" | "mastered" | "smart"

export type LearningSession = {
  id: string
  mode: LearningFilter
  filterSearch: string
  sessionSize: number
  wordIds: string[]
  currentIndex: number
  completedWordIds: string[]
  skippedWordIds: string[]
  startedAt: string
  lastActiveAt: string
  status: "active" | "completed"
  sessionVersion: 1
}

export type StorageEnvelope = {
  version: 1
  exportedAt: string
  wordsMeta: { count: number; sourceHash: string }
  userProfile: UserProfile
  wordProgress: Record<string, WordProgress>
  attempts: Attempt[]
  sessions: Session[]
  streak: Streak
  gamification: Gamification
  settings: Settings
  dailyProgress: Record<string, DailyProgress>
  userWords: Word[]
  hiddenWordIds: string[]
  metaLearning: MetaLearningStore
  activeLearningSession: LearningSession | null
}
