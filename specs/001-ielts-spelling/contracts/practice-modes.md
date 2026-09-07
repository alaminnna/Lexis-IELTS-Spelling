# Contracts: Practice Modes

**Source**: `src/services/adaptiveReview.ts` + `src/hooks/usePractice.ts`

## Modes

| id | label | pool | size | hiddenWord | selection |
|----|-------|------|------|------------|-----------|
| normal | Normal Practice | all words | user sessionLength (default 20) | no | sequential start or adaptive if enabled (Smart toggle) |
| listen | Listen & Type | all words | sessionLength | yes (audio-first) | adaptive |
| mistakes | Mistake Mode | wrong>0 | up to 50 | no | mastery asc then wrong desc |
| weak | Weak Words | tier weak/critical | up to 50 | no | mastery asc |
| quick10 | Quick 10 | all | 10 | no | random + adaptive blend |
| challenge50 | Challenge 50 | all | 50 | no | random without replacement |
| random | Random | all | sessionLength | no | uniform random |
| smart | Smart | all | sessionLength | no | full weighted adaptive |

## Interface

```ts
function selectNextWords(
  words: Word[],
  progress: Record<string, WordProgress>,
  mode: PracticeMode,
  count: number,
  adaptiveEnabled: boolean
): Word[]

function evaluateAnswer(
  expected: string, // normalized
  typed: string     // raw input
): { isCorrect: boolean; mistakeType?: MistakeType; hint?: string }

function updateMastery(prevScore: number, correct: boolean, streak: number): number
function computeXp(results: {correct:boolean, responseMs:number}[]): number
```

## Mastery Contract

- Input: prevScore 0-100, correct bool, currentStreak
- On correct: +6 base, +2 if streak>=3, +2 if prev mastered? capped +8 ; min 95 blocks at 95 until 3 streak to 100
- On wrong: -12 base, -3 extra if critical, -2 if repeated wrong; never below 0
- Output: new integer 0-100

## Audio Contract

```ts
interface AudioService {
  speak(word: string, slow?: boolean): Promise<void>
  cancel(): void
  playChime(type: "correct"|"wrong"|"streak"|"complete"): void
  setEnabled(v:boolean): void
  setVolume(v:number): void
}
```
- Uses `speechSynthesis`; if unavailable, `speak` resolves immediately and UI shows fallback.

## Keyboard Shortcuts Contract

- Enter → submit (if not already evaluated) else Next
- Space → playNormal
- R / r → playSlow
- N / n → next (after evaluated)
- Esc → exit practice (confirm dialog if mid-session)
- Focus always on input after transitions

## Session Summary Contract

After `wordIds` exhausted, produce session record and render `SessionSummary` with: correct/wrong, accuracy, avgResponseMs, xpEarned, weakest words (from session), mistake breakdown, delta vs prev session (if sessions.length>1).
