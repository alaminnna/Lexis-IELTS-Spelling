import { useAppStore } from "@/store/useAppStore"
import type { WordProgress, Attempt, Session, Streak, Gamification, DailyProgress } from "@/types/progress"

export type ProgressSlice = {
  wordProgress: Record<string, WordProgress>
  attempts: Attempt[]
  sessions: Session[]
  streak: Streak
  gamification: Gamification
  dailyProgress: Record<string, DailyProgress>
}

export function getProgress(): ProgressSlice | null {
  const env = useAppStore.getState().envelope
  if (!env) return null
  return {
    wordProgress: env.wordProgress,
    attempts: env.attempts,
    sessions: env.sessions,
    streak: env.streak,
    gamification: env.gamification,
    dailyProgress: env.dailyProgress,
  }
}

export async function saveProgress(partial: Partial<ProgressSlice>): Promise<void> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return
  Object.assign(env, partial)
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
}

export async function clearProgress(): Promise<void> {
  const store = useAppStore.getState()
  await store.clearProgress()
}

export function getStatistics() {
  const env = useAppStore.getState().envelope
  if (!env) return null
  const attempts = env.attempts
  const correct = attempts.filter(a => a.isCorrect).length
  const accuracy = attempts.length ? (correct / attempts.length) * 100 : 0
  const mastered = Object.values(env.wordProgress).filter(p => p.masteryScore >= 95).length
  const weak = Object.values(env.wordProgress).filter(p => p.masteryScore <= 59 && p.attempts > 0).length
  return { totalAttempts: attempts.length, correct, accuracy, mastered, weak }
}
