import type { MasteryTier } from "@/types/progress"

export function getTier(score: number): MasteryTier {
  if (score >= 95) return "mastered"
  if (score >= 80) return "strong"
  if (score >= 60) return "learning"
  if (score >= 40) return "weak"
  return "critical"
}

export function tierLabel(t: MasteryTier): string {
  const m: Record<MasteryTier, string> = {
    critical: "Critical",
    weak: "Weak",
    learning: "Learning",
    strong: "Strong",
    mastered: "Mastered",
  }
  return m[t]
}

export function tierColor(t: MasteryTier): string {
  const m: Record<MasteryTier, string> = {
    critical: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
    weak: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    learning: "text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900",
    strong: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    mastered: "text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900",
  }
  return m[t]
}

export function updateMastery(prevScore: number, correct: boolean, streak: number): number {
  let delta = 0
  if (correct) {
    delta = 6
    if (streak >= 3) delta += 2
    if (prevScore >= 95) delta = 2 // slow at top
    else if (prevScore >= 80) delta = 4
  } else {
    delta = -12
    if (prevScore <= 30) delta -= 3
    else if (prevScore <= 50) delta -= 2
    // larger penalty if repeated wrong? handled via caller streak=0
  }
  const next = Math.max(0, Math.min(100, Math.round(prevScore + delta)))
  return next
}

export function computeXp(results: { correct: boolean; responseMs: number }[]): number {
  let xp = 0
  for (const r of results) {
    if (r.correct) {
      xp += 10
      if (r.responseMs < 2500) xp += 2 // speed bonus
      if (r.responseMs < 1500) xp += 3
    } else {
      xp += 1 // participation
    }
  }
  // streak bonus
  let streak = 0
  let best = 0
  for (const r of results) {
    if (r.correct) { streak++; best = Math.max(best, streak) } else streak = 0
  }
  if (best >= 5) xp += 5
  if (best >= 10) xp += 10
  return xp
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 120)) + 1
}
export function xpForLevel(level: number): number {
  return 120 * Math.pow(level - 1, 2)
}
export function xpProgress(xp: number): { level: number; current: number; needed: number; pct: number } {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const current = xp - base
  const needed = next - base
  const pct = needed === 0 ? 100 : (current / needed) * 100
  return { level, current, needed, pct }
}
