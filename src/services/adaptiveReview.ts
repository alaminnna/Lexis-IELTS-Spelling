import type { Word } from "@/types/word"
import type { WordProgress, PracticeMode, WordState } from "@/types/progress"

// ---------- helpers ----------
function daysSince(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 86400000
}
function hoursSince(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 3600000
}

// Derive WordState from progress — single source, no duplication
export function deriveWordState(p?: WordProgress): WordState {
  if (!p || p.attempts === 0) return "UNSEEN"
  const acc = p.attempts ? p.correct / p.attempts : 0
  const s = p.masteryScore
  const cc = p.consecutiveCorrect ?? 0
  const cw = p.consecutiveWrong ?? 0
  if (p.wrong >= 3 && acc < 0.6) return "WEAK"
  if (s >= 95 && cw === 0 && acc >= 0.92 && p.attempts >= 8) return "MASTERED"
  if (s >= 80 && cc >= 3 && acc >= 0.85) return "STRONG"
  if (cw >= 2) return "WEAK"
  if (s >= 60 && cc >= 2) return "IMPROVING"
  return "LEARNING"
}

export function calculateMastery(p: WordProgress): number {
  // weighted: accuracy 35%, consecutive correct 20%, attempts stability 15%, recency 15%, response time 15%
  const acc = p.attempts ? p.correct / p.attempts : 0
  const streakBonus = Math.min(p.consecutiveCorrect / 5, 1) * 20
  const stability = Math.min(p.attempts / 10, 1) * 15
  const recencyPenalty = daysSince(p.lastPracticedISO) > 14 ? -8 : daysSince(p.lastPracticedISO) > 7 ? -4 : 0
  const speedBonus = p.avgResponseMs ? (p.avgResponseMs < 1800 ? 4 : p.avgResponseMs < 2800 ? 2 : 0) : 0
  const base = acc * 55 + streakBonus + stability + speedBonus + recencyPenalty + 10
  // clamp and smooth
  return Math.max(0, Math.min(100, Math.round(base)))
}

export function calculateNextReviewAt(p: WordProgress, wasCorrect: boolean): string | null {
  const now = Date.now()
  let days = 1
  if (wasCorrect) {
    // spaced: 1→3→7→14→30
    const cc = p.consecutiveCorrect
    if (cc <= 1) days = 1
    else if (cc === 2) days = 3
    else if (cc === 3) days = 7
    else if (cc === 4) days = 14
    else days = 30
    // if fast correct, push a bit further
    if (p.avgResponseMs && p.avgResponseMs < 1800) days = Math.round(days * 1.25)
  } else {
    // mistake → sooner, repeated mistake → very soon
    if (p.consecutiveWrong >= 3) days = 0.15 // ~3-4 hours
    else if (p.consecutiveWrong === 2) days = 0.5
    else days = 1
  }
  return new Date(now + days * 86400000).toISOString()
}

// ---------- priority ----------
export type SessionStats = {
  attempts: number
  correct: number
  wrong: number
  accuracy: number
  currentStreak: number
  recentResults: boolean[] // last 15
}

function sessionCondition(stats?: SessionStats): "struggling" | "steady" | "strong" {
  if (!stats || stats.attempts < 5) return "steady"
  const a = stats.accuracy
  if (a < 0.55) return "struggling"
  if (a > 0.85) return "strong"
  return "steady"
}

export function calculatePriority(
  word: Word,
  p: WordProgress | undefined,
  ctx: {
    recentWords: string[]
    sessionStats?: SessionStats
    now?: number
  }
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 10 // base

  if (!p || p.attempts === 0) {
    score += 18
    reasons.push("unseen +18")
    // unseen should not dominate if student struggling
    if (ctx.sessionStats && sessionCondition(ctx.sessionStats) === "struggling") score -= 6
    // small random to distribute unseen
    score += Math.random() * 4
    return { score, reasons }
  }

  const acc = p.attempts ? p.correct / p.attempts : 0
  const gapDays = daysSince(p.lastPracticedISO)
  const gapHours = hoursSince(p.lastWrongAt ?? null)

  // mistake frequency +++++
  if (p.wrong >= 4) { score += 22; reasons.push(`wrong×${p.wrong} +22`) }
  else if (p.wrong >= 2) { score += 14; reasons.push(`wrong×${p.wrong} +14`) }
  else if (p.wrong >= 1) { score += 6; reasons.push("wrong×1 +6") }

  // low accuracy +++++
  if (acc < 0.5) { score += 20; reasons.push(`acc ${(acc*100).toFixed(0)}% +20`) }
  else if (acc < 0.65) { score += 12; reasons.push(`acc ${(acc*100).toFixed(0)}% +12`) }
  else if (acc < 0.8) { score += 5; reasons.push(`acc ${(acc*100).toFixed(0)}% +5`) }

  // consecutive failures +++++
  if (p.consecutiveWrong >= 3) { score += 18; reasons.push(`consec wrong ${p.consecutiveWrong} +18`) }
  else if (p.consecutiveWrong === 2) { score += 10; reasons.push("consec wrong 2 +10") }

  // recent mistake ++++
  if (p.lastWrongAt && hoursSince(p.lastWrongAt) < 6) { score += 14; reasons.push("recent mistake <6h +14") }
  else if (p.lastWrongAt && hoursSince(p.lastWrongAt) < 24) { score += 8; reasons.push("recent mistake <24h +8") }

  // long time since review ++++
  if (gapDays > 14) { score += 12; reasons.push(`gap ${gapDays.toFixed(0)}d +12`) }
  else if (gapDays > 7) { score += 7; reasons.push(`gap ${gapDays.toFixed(0)}d +7`) }
  else if (gapDays > 3 && p.state !== "MASTERED") { score += 4; reasons.push(`gap ${gapDays.toFixed(0)}d +4`) }

  // nextReviewAt overdue
  if (p.nextReviewAt) {
    const overdueDays = (Date.now() - new Date(p.nextReviewAt).getTime()) / 86400000
    if (overdueDays > 0) { score += Math.min(10, overdueDays * 2); reasons.push(`overdue ${overdueDays.toFixed(1)}d +${Math.min(10, overdueDays*2).toFixed(0)}`) }
    else if (overdueDays > -0.5) { score += 4; reasons.push("due soon +4") }
  }

  // state based
  const st = p.state
  if (st === "WEAK") { score += 10; reasons.push("WEAK +10") }
  else if (st === "LEARNING") { score += 6; reasons.push("LEARNING +6") }
  else if (st === "IMPROVING") { score += 2; reasons.push("IMPROVING +2") }
  else if (st === "STRONG") { score -= 4; reasons.push("STRONG -4") }
  else if (st === "MASTERED") {
    // mastered rarely, but if long gap, allow maintenance
    if (gapDays < 7) { score -= 18; reasons.push("MASTERED -18") }
    else if (gapDays < 14) { score -= 10; reasons.push("MASTERED -10") }
    else { score += 2; reasons.push("MASTERED maintenance +2") }
  }

  // fast correct answers --
  if (p.avgResponseMs && p.avgResponseMs < 1600 && acc > 0.85) { score -= 6; reasons.push("fast correct -6") }

  // high accuracy ----
  if (acc > 0.92 && p.attempts >= 5) { score -= 10; reasons.push("high acc -10") }
  else if (acc > 0.85) { score -= 4; reasons.push("high acc -4") }

  // long correct streak -----
  if (p.consecutiveCorrect >= 5) { score -= 12; reasons.push(`streak ${p.consecutiveCorrect} -12`) }
  else if (p.consecutiveCorrect >= 3) { score -= 6; reasons.push(`streak ${p.consecutiveCorrect} -6`) }

  // recently practiced ----
  if (gapHours < 2) { score -= 10; reasons.push("recent <2h -10") }
  else if (gapHours < 12) { score -= 5; reasons.push("recent <12h -5") }

  // session condition adaptation
  const cond = sessionCondition(ctx.sessionStats)
  if (cond === "struggling") {
    // reduce unseen/new pressure, increase weak
    if (st === "WEAK" || st === "LEARNING") { score += 4; reasons.push("struggling boost weak +4") }
    if (!p || p.attempts === 0) { /* already handled */ }
  } else if (cond === "strong") {
    // allow more unseen and strong maintenance
    if (st === "UNSEEN") { score += 5; reasons.push("strong allow new +5") }
  }

  // difficulty adaptation: estimate via accuracy if no explicit difficulty
  // (Word difficulty is heuristic, we use acc as proxy — low acc = hard)

  // recent-words penalty to avoid immediate repetition
  const recentIdx = ctx.recentWords.lastIndexOf(word.id)
  if (recentIdx !== -1) {
    const distance = ctx.recentWords.length - recentIdx // 1 = most recent
    if (distance <= 3) { score -= 30; reasons.push(`recent distance ${distance} -30`) }
    else if (distance <= 6) { score -= 14; reasons.push(`recent ${distance} -14`) }
    else if (distance <= 10) { score -= 6; reasons.push(`recent ${distance} -6`) }
    // critical repeated mistake exception: allow sooner
    if (p.consecutiveWrong >= 3 && distance <= 3) {
      score += 12; reasons.push("critical exception +12")
    }
  }

  // clamp and add tiny jitter for tie-break
  score += (Math.random() - 0.5) * 1.5
  score = Math.max(0, score)
  return { score, reasons }
}

// ---------- selection ----------
const recentGlobal: string[] = [] // shared in-memory recent history (per session)

export function getRecentWords(): string[] { return [...recentGlobal] }
export function pushRecentWord(id: string) {
  recentGlobal.push(id)
  if (recentGlobal.length > 20) recentGlobal.shift()
}
export function clearRecent() { recentGlobal.length = 0 }

export function debugWhy(word: Word, p: WordProgress | undefined, ctx: { recentWords: string[]; sessionStats?: SessionStats }): string {
  const { score, reasons } = calculatePriority(word, p, ctx)
  return `Selected: ${word.word} (${word.category})\nPriority: ${score.toFixed(1)}\nState: ${p?.state ?? "UNSEEN"} | acc: ${p ? ((p.correct / Math.max(1, p.attempts)) * 100).toFixed(0) : "-"}% | wrong: ${p?.wrong ?? 0} | streak: ${p?.consecutiveCorrect ?? 0}/${p?.consecutiveWrong ?? 0}\nReasons: ${reasons.join(", ") || "base"}\n`
}

// Weighted pool strategy — dynamic percentages
function targetDistribution(sessionStats?: SessionStats, progress?: Record<string, WordProgress>) {
  const total = progress ? Object.keys(progress).length : 0
  const weakCount = progress ? Object.values(progress).filter(p => p.state === "WEAK").length : 0
  const unseenRatio = total ? (884 - total) / 884 : 1
  const cond = sessionCondition(sessionStats)
  if (cond === "struggling") {
    return { weak: 0.45, learning: 0.28, unseen: 0.12, review: 0.12, strong: 0.03 }
  }
  if (cond === "strong") {
    return { weak: 0.28, learning: 0.22, unseen: 0.28, review: 0.14, strong: 0.08 }
  }
  // steady — adapt to unseen ratio
  if (unseenRatio > 0.6) return { weak: 0.32, learning: 0.22, unseen: 0.28, review: 0.13, strong: 0.05 }
  if (weakCount > 30) return { weak: 0.45, learning: 0.25, unseen: 0.15, review: 0.12, strong: 0.03 }
  return { weak: 0.40, learning: 0.25, unseen: 0.20, review: 0.10, strong: 0.05 }
}

export function getNextWord(
  words: Word[],
  progress: Record<string, WordProgress>,
  ctx: { recentWords?: string[]; sessionStats?: SessionStats } = {}
): Word | null {
  if (words.length === 0) return null
  const recent = ctx.recentWords ?? getRecentWords()
  // score all
  const scored = words.map(w => {
    const p = progress[w.id]
    const { score, reasons } = calculatePriority(w, p, { recentWords: recent, sessionStats: ctx.sessionStats })
    return { w, p, score, reasons }
  })
  // filter out ultra-recent unless pool too small
  const eligible = scored.filter(s => {
    const idx = recent.lastIndexOf(s.w.id)
    if (idx === -1) return true
    const dist = recent.length - idx
    // allow critical repeated to bypass
    if (s.p?.consecutiveWrong && s.p.consecutiveWrong >= 3 && dist <= 3) return true
    return dist > 3
  })
  const pool = eligible.length >= 20 ? eligible : scored
  // sort by score desc
  pool.sort((a, b) => b.score - a.score)
  // weighted sample from top 40
  const top = pool.slice(0, Math.min(40, pool.length))
  const total = top.reduce((s, x) => s + Math.max(0.1, x.score), 0)
  let r = Math.random() * total
  for (const cand of top) {
    r -= Math.max(0.1, cand.score)
    if (r <= 0) {
      pushRecentWord(cand.w.id)
      return cand.w
    }
  }
  const pick = top[0]
  pushRecentWord(pick.w.id)
  return pick.w
}

export function getNextWordsWithDebug(
  words: Word[],
  progress: Record<string, WordProgress>,
  count: number,
  ctx: { recentWords?: string[]; sessionStats?: SessionStats } = {}
): { word: Word; debug: string }[] {
  const res: { word: Word; debug: string }[] = []
  const recent = [...(ctx.recentWords ?? getRecentWords())]
  for (let i = 0; i < count; i++) {
    const scored = words.map(w => {
      const p = progress[w.id]
      return { w, p, ...calculatePriority(w, p, { recentWords: recent, sessionStats: ctx.sessionStats }) }
    })
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 40)
    const total = top.reduce((s, x) => s + Math.max(0.1, x.score), 0)
    let r = Math.random() * total
    let pick = top[0]
    for (const c of top) { r -= Math.max(0.1, c.score); if (r <= 0) { pick = c; break } }
    res.push({ word: pick.w, debug: debugWhy(pick.w, pick.p, { recentWords: recent, sessionStats: ctx.sessionStats }) })
    recent.push(pick.w.id)
    if (recent.length > 20) recent.shift()
  }
  return res
}

// ---------- legacy selectNextWords wrapper (keeps Practice compatible) ----------
export function selectNextWords(
  words: Word[],
  progress: Record<string, WordProgress>,
  mode: PracticeMode,
  count: number,
  adaptiveEnabled: boolean
): Word[] {
  // ensure states are derived for all progress entries (migration)
  for (const p of Object.values(progress)) {
    if (!p.state) p.state = deriveWordState(p as WordProgress)
    if (p.accuracy === undefined) p.accuracy = p.attempts ? (p.correct / p.attempts) * 100 : 0
    if (p.consecutiveCorrect === undefined) p.consecutiveCorrect = p.currentStreak
    if (p.consecutiveWrong === undefined) p.consecutiveWrong = p.wrong > 0 && p.currentStreak === 0 ? 1 : 0
  }

  if (words.length === 0) return []
  // mode-specific pools (preserve old behavior but now with priority inside)
  const pool = (() => {
    switch (mode) {
      case "mistakes": {
        const ids = Object.values(progress).filter(p => p.wrong > 0).map(p => p.wordId)
        const set = new Set(ids)
        const filtered = words.filter(w => set.has(w.id))
        return filtered.length ? filtered : words
      }
      case "weak": {
        const weakIds = Object.values(progress).filter(p => p.state === "WEAK" || p.state === "LEARNING").map(p => p.wordId)
        if (weakIds.length === 0) {
          const sorted = [...words].sort((a, b) => {
            const pa = progress[a.id]?.masteryScore ?? 50
            const pb = progress[b.id]?.masteryScore ?? 50
            return pa - pb
          })
          return sorted.slice(0, Math.min(count * 3, words.length))
        }
        const s = new Set(weakIds)
        return words.filter(w => s.has(w.id))
      }
      default:
        return words
    }
  })()

  if (!adaptiveEnabled) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, pool.length))
  }

  // For smart/listen, use full adaptive engine with session awareness
  // Build sessionStats from recent results if available via progress? We approximate via overall
  const dummySession: SessionStats | undefined = undefined // Practice will pass real stats via getNextWord directly next iteration

  // Use weighted pool distribution for variety
  // Instead of pure priority sort, sample with distribution
  const result: Word[] = []
  const recent: string[] = [...getRecentWords()]
  // ensure recent respects gap
  for (let i = 0; i < count; i++) {
    const next = getNextWord(pool, progress, { recentWords: recent, sessionStats: dummySession })
    if (!next) break
    result.push(next)
    recent.push(next.id)
    if (recent.length > 20) recent.shift()
  }
  return result
}

function sortByWeight(pool: Word[], progress: Record<string, WordProgress>) {
  return [...pool].sort((a, b) => {
    const pa = calculatePriority(a, progress[a.id], { recentWords: getRecentWords() }).score
    const pb = calculatePriority(b, progress[b.id], { recentWords: getRecentWords() }).score
    return pb - pa
  })
}
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }
