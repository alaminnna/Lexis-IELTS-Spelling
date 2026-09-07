import type { Attempt, Session, WordProgress, MistakeType } from "@/types/progress"

export function accuracyOverTime(attempts: Attempt[], days = 14): { date: string; accuracy: number; count: number }[] {
  if (!attempts.length) return []
  const map = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const d = a.timestampISO.slice(0, 10)
    const cur = map.get(d) || { correct: 0, total: 0 }
    cur.total++
    if (a.isCorrect) cur.correct++
    map.set(d, cur)
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const last = sorted.slice(-days)
  return last.map(([date, v]) => ({ date: date.slice(5), accuracy: v.total ? (v.correct / v.total) * 100 : 0, count: v.total }))
}

export function masteryDistribution(progress: Record<string, WordProgress>): { tier: string; count: number }[] {
  const counts: Record<string, number> = { critical: 0, weak: 0, learning: 0, strong: 0, mastered: 0, untouched: 0 }
  const totalIds = new Set(Object.keys(progress))
  for (const p of Object.values(progress)) counts[p.masteryTier]++
  // untouched approximated? Not needed – computed elsewhere via WORDS length
  return Object.entries(counts).map(([tier, count]) => ({ tier, count }))
}

export function mistakeBreakdown(attempts: Attempt[]): { type: MistakeType; count: number }[] {
  const m = new Map<MistakeType, number>()
  for (const a of attempts) if (!a.isCorrect && a.mistakeType) m.set(a.mistakeType, (m.get(a.mistakeType) || 0) + 1)
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
}

export function categoryPerformance(
  attempts: Attempt[],
  wordToCategory: Map<string, string>
): { category: string; accuracy: number; total: number }[] {
  const map = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const cat = wordToCategory.get(a.wordId) || "Other"
    const cur = map.get(cat) || { correct: 0, total: 0 }
    cur.total++
    if (a.isCorrect) cur.correct++
    map.set(cat, cur)
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, accuracy: v.total ? (v.correct / v.total) * 100 : 0, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

export function heatmapData(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) {
    const d = s.startedAt.slice(0, 10)
    m.set(d, (m.get(d) || 0) + s.wordIds.length)
  }
  return m
}
