# Data Model — IELTS Spelling Trainer (Production-Ready Local-First)

**Feature**: `001-ielts-spelling` | **Date**: 2026-09-07 | **Sources**: `prompt.md` §1–35, `spec.md` FR-001–FR-020, codebase `src/types/progress.ts`, `src/types/word.ts`, `src/services/storage.ts`, `src/services/adaptiveReview.ts`

## Entities

### UserProfile (NEW — Prompt §1–3, §15)

```ts
type UserProfile = {
  id: string                    // stable: "local-user" (single per browser) or uuid v4 persisted
  name: string                  // trimmed, 1..60 chars, validated non-empty
  onboardingCompleted: boolean  // false → gate to Onboarding; true → dashboard
  createdAt: string             // ISO datetime
  updatedAt: string | null      // ISO, set on name edit
}
// back-compat alias: envelope.profile == userProfile
```

- **Validation**: `name.trim().length >=1 && <=60` else reject; HTML stripped via `simpleSanitize`; XSS-safe rendering.
- **Persistence**: Inside `StorageEnvelope.userProfile`; also mirrored to LS/IDB via `userStorage.ts`. Editing persists immediately and Dashboard selector re-renders.

### Word

```ts
type Difficulty = "easy" | "medium" | "hard"
type WordSource = "system" | "user"

type Word = {
  id: string              // slug, e.g. "accommodation" or "resilient" (+ counter if clash)
  word: string            // display form, 1..60, sanitized
  normalized: string      // lower, trimmed, collapsed spaces
  category: string        // e.g. "Money matters" or "My Words"
  categorySlug: string    // slugified
  difficulty: Difficulty  // heuristic default "medium"
  source?: WordSource     // "system" (from MD) or "user" (custom)
  banglaMeaning?: string
  meaning?: string
  partOfSpeech?: string
  pronunciation?: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
  personalNote?: string   // for system words stored as overlay `overlay-<id>`
  audioUrl?: string
  spellingTip?: string
  createdAt?: string      // for user words
  updatedAt?: string
  hidden?: boolean
}
```

- Source: generated from MD (~884) immutable; user words stored in `StorageEnvelope.userWords`. All via `getAllWords()` (service filters `hiddenWordIds`).
- Validation: word non-empty 1..60; allowed [a-z \-’']; normalized required.

### WordProgress

```ts
type MasteryTier = "critical" | "weak" | "learning" | "strong" | "mastered"
type MistakeType = "missing" | "extra" | "wrong" | "transposition" | "repeated" | "vowel" | "consonant" | "multiple"
type WordState = "UNSEEN" | "LEARNING" | "WEAK" | "IMPROVING" | "STRONG" | "MASTERED"

type WordProgress = {
  wordId: string
  attempts: number
  correct: number
  wrong: number
  accuracy: number              // 0-100 derived = correct/attempts*100
  masteryScore: number          // 0..100 (via calculateMastery)
  masteryTier: MasteryTier      // derived via getTier(score): 0-39 critical, 40-59 weak, 60-79 learning, 80-94 strong, 95-100 mastered
  state: WordState              // derived via deriveWordState
  currentStreak: number
  bestStreak: number
  consecutiveCorrect: number
  consecutiveWrong: number
  lastPracticedISO: string | null
  lastAttemptAt: string | null
  lastCorrectAt: string | null
  lastWrongAt: string | null
  nextReviewAt: string | null   // ISO, spaced: 1→3→7→14→30 days correct, 0.15–1 day wrong
  avgResponseMs: number | null
  totalResponseMs: number
  mistakeHistogram: Record<MistakeType, number>
  lastMistakeType?: MistakeType
  historicalMastery: number     // max achieved (for decay display)
}
```

- Created lazily on first attempt (`ensureProgress`). Persists in `StorageEnvelope.wordProgress[ wordId ]`.
- Updates only on `recordAttempt` (submit) — never on display (§24).

### Attempt

```ts
type Attempt = {
  id: string
  wordId: string
  timestampISO: string          // UTC; converted to local YYYY-MM-DD for today grouping
  typed: string                 // raw input
  normalizedTyped: string
  isCorrect: boolean
  mistakeType?: MistakeType
  responseMs: number            // 0..120000, capped
  mode: PracticeMode
}
```

- Capped to last 5000 in envelope. Used for dashboard/session/mistake/statistics/heats.

### Session

```ts
type PracticeMode = "normal" | "listen" | "mistakes" | "weak" | "quick10" | "challenge50" | "random" | "smart"
type Session = {
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
```

- Started in `startSession(mode, wordIds)`, completed in `completeSession(id, results)` computing `correctCount/wrongCount/avg/xpEarned`. Persists in `StorageEnvelope.sessions`.

### Streak & DailyGoal

```ts
type Streak = {
  current: number
  longest: number
  lastPracticeDateISO: string | null // YYYY-MM-DD local
  practiceDays: number
  totalSessions: number
  history: string[]            // unique YYYY-MM-DD
}
type DailyProgress = { dateISO: string; count: number; goal: number } // keyed by YYYY-MM-DD
```

- `current` increments only if `lastPracticeDateISO === yesterday` (local), stays if today, resets to 1 if gap>1. Updated via `updateStreak()` called from `recordAttempt`, not dashboard mount — prevents fake streak (§6).

### Settings & Gamification

```ts
type Settings = {
  theme: "light" | "dark" | "system"
  soundEnabled: boolean
  volume: number // 0..1 clamped
  autoPlay: boolean
  slowRate: boolean
  dailyGoal: number // 5..200, presets 10/20/30/50/100 + custom
  defaultMode: PracticeMode
  adaptiveEnabled: boolean
  sessionLength: number // 10|20|30|50, default 20
}
type AchievementId = "first100" | "streak7" | "perfect" | "master500" | "streak20" | "practice1000" | "firstMistake" | "goal7"
type Gamification = {
  xp: number
  level: number // floor(sqrt(xp/120))+1
  achievements: { id: AchievementId; unlockedAt: string }[]
  personalBests: { bestAccuracy: number; bestStreak: number; fastestAvgMs: number | null }
}
```

- Settings only controls implemented behavior (§14, §21). Each change persists via `updateSettings(patch)` → `saveEnvelope`.

### LearningSession

```ts
type LearningFilter = "all" | "new" | "needsReview" | "weak" | "learning" | "mastered" | "smart"
type LearningSession = {
  id: string
  mode: LearningFilter
  filterSearch: string
  sessionSize: number // 10|20|30
  wordIds: string[]
  currentIndex: number
  completedWordIds: string[]
  skippedWordIds: string[]
  startedAt: string
  lastActiveAt: string
  status: "active" | "completed"
  sessionVersion: 1
}
```

- Persisted in `StorageEnvelope.activeLearningSession` for resume.

### MetaLearning (existing)

```ts
type MetaLearningStore = {
  methodStats: Record<LearningMethod, { attempts: number; correct: number }>
  wordMethods: Record<string, LearningMethod>
}
```

- Persisted for adaptive learning method selection.

### StorageEnvelope (updated — Prompt §8–9)

```ts
const STORAGE_VERSION = 1

type StorageEnvelope = {
  version: typeof STORAGE_VERSION // 1
  exportedAt: string              // ISO set on each save (for import/export)
  wordsMeta: { count: number; sourceHash: string }
  // NEW required
  userProfile: UserProfile
  // existing
  wordProgress: Record<string, WordProgress>
  attempts: Attempt[]             // last 5000
  sessions: Session[]
  streak: Streak
  gamification: Gamification
  settings: Settings
  dailyProgress: Record<string, DailyProgress>
  userWords: Word[]
  hiddenWordIds: string[]
  metaLearning: MetaLearningStore
  activeLearningSession: LearningSession | null
  // alias for legacy: profile == userProfile
}
```

- **Validation**: `version===STORAGE_VERSION` else migration/recovery; required keys `wordProgress/settings/userProfile`.
- **Export/Import**: `exportJson` includes envelope as JSON; `importJson` validates version and non-empty `wordProgress/settings/userProfile`, caps attempts, re-derives `masteryTier`.

## Relationships

- Word 1—1 WordProgress (lazy, keyed by wordId)
- Word 1—N Attempt, Session N—N Word
- UserProfile 1—N (WordProgress/Attempt/Session) via envelope ownership (one profile per envelope per browser)
- StorageEnvelope 1—1 of each sub-entity.

## State Transitions

- **Onboarding**: `onboardingCompleted:false -> true` on valid name submit; profile `updatedAt` on edit.
- **Attempt**: creation increments WordProgress, computes `masteryScore` via `calculateMastery`, sets `state` via `deriveWordState`, `nextReviewAt` via `calculateNextReviewAt`.
- **Session**: `pending -> active -> completed` (xp/level at complete).
- **Streak**: `updateStreak` logic above; longest = max.
- **Clear Practice Progress**: resets `wordProgress` (or streak-sensitive fields), `attempts`, `sessions`, `streak.current/longest/history` slice, `dailyProgress`, `gamification.personalBests` related slice, `metaLearning` optional retention? Prompt says adaptive engine state cleared with progress — so `wordProgress` reset / mastery 50, `metaLearning.wordMethods` cleared for those words; `userWords/hiddenWordIds/settings/userProfile` untouched.
- **Clear All Data**: replaces envelope with `defaultEnvelope()` (`version:1`, empty progress, empty arrays, `onboardingCompleted:false`, `userProfile.name=""`, `settings` defaults, `userWords:[]`).

## Derived / Computed (all real, §6, no mocks)

- `accuracy = correct/attempts*100` (null→0 display, no fake 12%).
- `masteryScore` weighted: `acc*55 + streakBonus(0–20) + stability(0–15) + speedBonus(0–4) + recencyPenalty(-8..0) + 10`, clamped 0–100.
- Weak/weakest via `masteryScore asc + wrong desc`; mastered via `masteryScore>=95`.
- Daily `count/goal` from `dailyProgress[YYYY-MM-DD]`, ring `pct = count/goal*100`.
- PracticeTime `sum(totalResponseMs)/60000`.
- Single source: every page derives from `useAppStore.envelope` — no duplicated logic.

## Validation Rules

- `userProfile.name` 1..60 after trim, sanitized; rejects empty.
- `word.normalized` lowercase a-z with spaces/hyphens only.
- `responseMs` 0..120000, `xp` integer ≥0, `volume` 0..1, `dailyGoal` 5..200, `sessionLength` 10|20|30|50.
- Envelope JSON `version===1` else throw "Invalid envelope version" on import; corrupted slice → graceful slice-reset with toast, never app crash.
- Foreign phrase words: case-insensitive, trim, collapsed spaces for matching.

## Indexes & Performance

- Word lists memoized with `useMemo` + debounced search (250ms), virtual slice to 400.
- `wordProgress` map O(1) per word; aggregations O(N) on `attempts` (≤5000) <50ms.
- No per-keystroke persistence; only boundaries.
