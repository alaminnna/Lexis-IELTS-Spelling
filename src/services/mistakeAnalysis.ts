import type { MistakeType } from "@/types/progress"

const VOWELS = new Set(["a", "e", "i", "o", "u"])

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
      // transposition (Damerau)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1)
      }
    }
  }
  return dp[m][n]
}

function hasRepeatedLetter(s: string): boolean {
  return /(.)\1/.test(s)
}

function isTransposition(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diffs: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs.push(i)
  if (diffs.length !== 2) return false
  const [i, j] = diffs
  return j === i + 1 && a[i] === b[j] && a[j] === b[i]
}

export function analyzeMistake(expectedRaw: string, typedRaw: string): { isCorrect: boolean; mistakeType?: MistakeType; distance: number } {
  const expected = normalize(expectedRaw)
  const typed = normalize(typedRaw)
  if (expected === typed) return { isCorrect: true, distance: 0 }

  const dist = levenshtein(expected, typed)
  const expLen = expected.length
  const typedLen = typed.length

  // Missing letter: typed shorter by 1 and one insertion fixes
  if (typedLen + 1 === expLen && dist === 1) return { isCorrect: false, mistakeType: "missing", distance: dist }
  // Extra letter
  if (typedLen === expLen + 1 && dist === 1) return { isCorrect: false, mistakeType: "extra", distance: dist }

  if (isTransposition(expected, typed)) return { isCorrect: false, mistakeType: "transposition", distance: dist }

  // Single substitution cases - classify further
  if (dist === 1 && typedLen === expLen) {
    // find differing char
    let idx = -1
    for (let i = 0; i < expLen; i++) if (expected[i] !== typed[i]) { idx = i; break }
    const ec = expected[idx]
    const tc = typed[idx]
    const eVowel = VOWELS.has(ec)
    const tVowel = VOWELS.has(tc)
    // Repeated-letter mistake: expected has double, typed single or vice versa nearby
    // e.g., accommodation -> accomodation (missing one m)
    // Heuristic: if expected has double at idx and typed not, or vice versa
    if (hasRepeatedLetter(expected) && !hasRepeatedLetter(typed)) {
      // check if the double is near diff
      return { isCorrect: false, mistakeType: "repeated", distance: dist }
    }
    if (eVowel && tVowel) return { isCorrect: false, mistakeType: "vowel", distance: dist }
    if (!eVowel && !tVowel) return { isCorrect: false, mistakeType: "consonant", distance: dist }
    // vowel vs consonant swap could be classified as wrong
    return { isCorrect: false, mistakeType: "wrong", distance: dist }
  }

  // Check repeated-letter pattern for longer distance 1 but involving double?
  if (dist === 1) {
    if (hasRepeatedLetter(expected) !== hasRepeatedLetter(typed)) {
      return { isCorrect: false, mistakeType: "repeated", distance: dist }
    }
  }

  // Vowel-only differences (multiple but all vowel changes)
  if (typedLen === expLen) {
    let vowelDiff = 0
    let consonantDiff = 0
    let other = 0
    for (let i = 0; i < expLen; i++) if (expected[i] !== typed[i]) {
      const ev = VOWELS.has(expected[i])
      const tv = VOWELS.has(typed[i])
      if (ev && tv) vowelDiff++
      else if (!ev && !tv) consonantDiff++
      else other++
    }
    if (vowelDiff > 0 && consonantDiff === 0 && other === 0) return { isCorrect: false, mistakeType: "vowel", distance: dist }
    if (consonantDiff > 0 && vowelDiff === 0 && other === 0) return { isCorrect: false, mistakeType: "consonant", distance: dist }
  }

  // Multiple errors if distance >2 or mixed types
  if (dist >= 2) {
    // if distance is 2 but could be two separate categories, mark multiple
    // Check if one of them is repeated pattern + other
    if (hasRepeatedLetter(expected) || hasRepeatedLetter(typed)) {
      // still multiple if dist>1
      if (dist > 1) return { isCorrect: false, mistakeType: "multiple", distance: dist }
    }
    if (dist === 2) {
      // see if exactly two single errors that would be separate?
      return { isCorrect: false, mistakeType: "multiple", distance: dist }
    }
    return { isCorrect: false, mistakeType: "multiple", distance: dist }
  }

  return { isCorrect: false, mistakeType: "wrong", distance: dist }
}

export function mistakeLabel(t: MistakeType): string {
  const map: Record<MistakeType, string> = {
    missing: "Missing letter",
    extra: "Extra letter",
    wrong: "Wrong letter",
    transposition: "Letter order",
    repeated: "Repeated letter",
    vowel: "Vowel mistake",
    consonant: "Consonant mistake",
    multiple: "Multiple errors",
  }
  return map[t]
}

export function mistakeColor(t: MistakeType): string {
  const map: Record<MistakeType, string> = {
    missing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    extra: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200",
    wrong: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200",
    transposition: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200",
    repeated: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200",
    vowel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200",
    consonant: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    multiple: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200",
  }
  return map[t]
}
