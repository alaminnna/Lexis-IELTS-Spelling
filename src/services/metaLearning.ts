import type { Word } from "@/types/word"
import type { WordProgress } from "@/types/progress"

export type LearningMethod = "visual" | "audio" | "chunking" | "pattern" | "recall" | "example"

export type MethodStats = {
  attempts: number
  success: number
  totalTimeMs: number
  get successRate(): number
  avgTimeMs: number | null
}

export type WordLearningProfile = {
  wordId: string
  recognition: number // 0-100
  spellingRecall: number
  audioRecall: number
  visualRecall: number
  retention: number
  bestMethod: LearningMethod | null
  mistakePattern?: string
}

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null }

type RawMethodStats = { attempts: number; success: number; totalTimeMs: number }

export type MetaLearningStore = {
  methodStats: Record<LearningMethod, RawMethodStats>
  wordMethods: Record<string, { method: LearningMethod; success: boolean; timeMs: number; at: string }[]>
}

export function createDefaultMeta(): MetaLearningStore {
  return {
    methodStats: {
      visual: { attempts: 0, success: 0, totalTimeMs: 0 },
      audio: { attempts: 0, success: 0, totalTimeMs: 0 },
      chunking: { attempts: 0, success: 0, totalTimeMs: 0 },
      pattern: { attempts: 0, success: 0, totalTimeMs: 0 },
      recall: { attempts: 0, success: 0, totalTimeMs: 0 },
      example: { attempts: 0, success: 0, totalTimeMs: 0 },
    },
    wordMethods: {},
  }
}

export function recordMethod(store: MetaLearningStore, wordId: string, method: LearningMethod, success: boolean, timeMs: number) {
  const m = store.methodStats[method]
  m.attempts++
  if (success) m.success++
  m.totalTimeMs += timeMs
  if (!store.wordMethods[wordId]) store.wordMethods[wordId] = []
  store.wordMethods[wordId].push({ method, success, timeMs, at: new Date().toISOString() })
  if (store.wordMethods[wordId].length > 12) store.wordMethods[wordId].shift()
}

export function getBestMethod(store: MetaLearningStore): LearningMethod | null {
  let best: LearningMethod | null = null
  let bestRate = -1
  for (const k of Object.keys(store.methodStats) as LearningMethod[]) {
    const s = store.methodStats[k]
    if (s.attempts < 3) continue
    const rate = s.success / s.attempts
    if (rate > bestRate) { bestRate = rate; best = k }
  }
  return best
}

export function getWordProfile(wordId: string, progress: WordProgress | undefined, store: MetaLearningStore): WordLearningProfile {
  const hist = store.wordMethods[wordId] ?? []
  const p = progress
  const acc = p ? p.correct / Math.max(1, p.attempts) : 0
  const rec = hist.filter(h => h.success).length / Math.max(1, hist.length)
  // simple heuristics for profile
  return {
    wordId,
    recognition: p ? Math.min(100, p.attempts * 12) : 0,
    spellingRecall: acc * 100 * 0.7 + rec * 30,
    audioRecall: p ? (p.avgResponseMs && p.avgResponseMs < 2000 ? 70 : 50) : 0,
    visualRecall: rec * 100,
    retention: p && p.nextReviewAt ? (new Date(p.nextReviewAt).getTime() > Date.now() ? 70 : 40) : 30,
    bestMethod: hist.length ? hist.slice(-5).reduce((a, b) => (b.success ? b.method : a), hist[hist.length - 1]?.method ?? null as any) : getBestMethod(store),
    mistakePattern: p?.lastMistakeType,
  }
}

export function explainSelection(word: Word, profile: WordLearningProfile): string {
  if (profile.spellingRecall < 40) return "You often miss spelling — visual chunking + recall will help."
  if (profile.audioRecall < 40) return "You remember better after hearing — audio-first will help."
  if (profile.mistakePattern === "repeated") return "You often miss double letters — we'll highlight them."
  if (profile.retention < 50) return "You knew it before but forgot — spaced review."
  return "Balanced review."
}

export function chooseMethodForWord(word: Word, store: MetaLearningStore, progress?: WordProgress): LearningMethod {
  const profile = getWordProfile(word.id, progress, store)
  // if we have a clear best method globally and word is weak, use it
  const best = getBestMethod(store)
  if (best && progress && progress.wrong >= 2) {
    // experiment: 80% best, 20% other for exploration
    if (Math.random() < 0.8) return best
  }
  // heuristic by word shape
  const w = word.word.toLowerCase()
  if (/(.)\1/.test(w) && w.length > 7) return "chunking"
  if (w.length > 10) return "pattern"
  if (profile.audioRecall < profile.visualRecall) return "audio"
  return "visual"
}
