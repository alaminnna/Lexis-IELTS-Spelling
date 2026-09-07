# Feature Specification: Lexis — IELTS Spelling Training System

**Feature Branch**: `ielts-spelling-training`

**Created**: 2026-09-07

**Status**: Draft (derived from implemented codebase + prompt.md 1162 lines)

**Input**: User description: "Premium personal IELTS Spelling Training Web App — Duolingo engagement + Linear polish + typing trainer, 1200-word Listening corpus, adaptive review, mistake intelligence, local-first" — see `prompt.md:4-86`

## User Scenarios & Testing

### User Story 1 — Listen & Type (IELTS exam simulation) (Priority: P1)

As the primary learner, I want to hear a word spoken (without seeing its spelling) and type what I hear, so that I replicate IELTS Listening spelling conditions and expose real listening→orthography gaps.

**Why this priority**: This is the *product heart* (`prompt.md:132-171` + `src/pages/Practice.tsx:18`). All other features (mastery, streaks, analytics) depend on this loop producing attempts. It is the daily-use habit.

**Independent Test**: Can be fully tested by opening `/practice`, hearing autoplay pronunciation for a word, typing an answer, pressing Enter/Check, receiving correct/wrong feedback, and advancing to Next — delivers exam-realistic drill without touching dashboard/analytics.

**Acceptance Scenarios**:
1. **Given** I am on `/practice` with sound enabled and auto-play on, **When** a new word loads, **Then** pronunciation auto-plays within 400ms, replay and slow buttons are available, and the input is focused (`src/pages/Practice.tsx:72-76, 95-104`).
2. **Given** I typed `accomodation` for `accommodation` and press Enter, **When** evaluation runs, **Then** I see "Not quite" with my answer and a "View spelling" CTA, mistakeType = `repeated` (or `missing`), attempt is persisted, masteryScore decreases by ~12, and `streak` resets (`src/services/mistakeAnalysis.ts:74, src/services/scoring.ts:33, src/store/useAppStore.ts:98-115`).
3. **Given** feedback is in `wrong` or `revealed` state, **When** I start typing again, **Then** the previous answer is cleared, state returns to `typing`, and the same word remains (no auto-advance) so I can retry before `Next` (`src/pages/Practice.tsx:172-184`).
4. **Given** I press Space when input is NOT focused, **When** the global handler fires, **Then** pronunciation replays without submitting (`src/pages/Practice.tsx:211-214`). Pressing `R` replays slowly (`src/pages/Practice.tsx:216-219`).
5. **Given** I complete all words in the session (default 20 per `src/services/storage.ts:33`), **When** I press Next on the last word, **Then** `completeSession` finalises results, computes XP with speed bonus, updates level/achievements, and shows Session complete summary with correct/wrong/avg ms (`src/store/useAppStore.ts:171-195, src/pages/Practice.tsx:139-267`).

---

### User Story 2 — Adaptive smart review + mastery tiers (Priority: P1)

As a learner who repeats weak words more often, I want the system to prioritise words I fail frequently, recently, or with low accuracy, and to surface weak words separately, so practice time is spent where it matters.

**Why this priority**: Without adaptive selection the 884-word corpus would be random drilling; prompt calls this "one of the most important parts" (`prompt.md:269-305`). It directly impacts band-score ROI.

**Independent Test**: Can be tested by seeding `wordProgress` with varied masteryScores (e.g., one word 20/critical, many mastered 98), calling `selectNextWords(WORDS, progress, "smart", 20, true)` and asserting critical/weak words are over-represented vs random sample (`src/services/adaptiveReview.ts:98`).

**Acceptance Scenarios**:
1. **Given** a word has masteryScore 25, 5 wrongs, last practiced 8 days ago, **When** weight is computed, **Then** masteryFactor ~ high + failFactor 3.1 + recency 1.33 + accBoost 1.7 gives top-ranked weight vs a mastered 98 score (`src/services/adaptiveReview.ts:11-42`).
2. **Given** adaptiveEnabled = false, **When** mode is `normal` or `listen`, **Then** selection falls back to shuffled random rather than weightedSample (`src/services/adaptiveReview.ts:106`).
3. **Given** masteryScore is 50 (initial) for untouched, **When** untouched word is weighted, **Then** it gets 25±2.5 moderate boost to ensure new words enter rotation (`src/services/adaptiveReview.ts:12-15`).
4. **Given** weak filter is active (Words page mastery=weak), **When** library filters, **Then** only words with masteryTier weak (40-59) and attempts>0 appear (`src/pages/Words.tsx:28-31` — note bug with recentlyWrong, see Gaps).

---

### User Story 3 — Weakness engine & dashboard feedback loop (Priority: P2)

As a learner reviewing progress, I want a dashboard that immediately answers "How am I doing?" and a dedicated Mistakes view of weakest words + mistake breakdown, so I can decide what to practise next.

**Why this priority**: Closes the loop: practice → record → visualise → act. Prompt mandates dashboard as the landing view with 10+ metrics (`prompt.md:396-458`) and "My Weakest Words" with tap-to-history (`prompt.md:368-394`).

**Independent Test**: Seed 3 sessions with mixes of correct/wrong; open Dashboard and Mistakes; verify daily goal ring, Level/XP bar, Today/Total/Streak/Mastered/PracticeTime stats, weakest 6 sorted by masteryScore, recent sessions, mistakeType badges — all without entering Practice.

**Acceptance Scenarios**:
1. **Given** today I practised 12 words with 75% accuracy, **When** I open Dashboard, **Then** Stat cards show `Today: 12 words • 75%`, staggered GSAP reveals fire if reduced-motion not set (`src/pages/Dashboard.tsx:51-118`).
2. **Given** I have 4 weakest words with masteryScore <40, **When** I view Mistakes → Weakest words, **Then** they are sorted by masteryScore asc then wrong desc, each shows accuracy, attempts, lastMistakeType badge with `mistakeColor` (`src/pages/Mistakes.tsx:14-18`).
3. **Given** no mistakes yet, **When** Mistakes loads, **Then** empty state "You haven't made any spelling mistakes yet." with ✓ icon and CTA appears (`src/pages/Mistakes.tsx:37-42`).

---

### User Story 4 — Word Library + Detail deep-dive (Priority: P2)

As a learner who wants control, I want searchable, filterable word library (36 categories, difficulty, mastery tier) and per-word detail with attempts/correct/wrong/accuracy/streak/avgTime/mistakeHistogram/history to decide what deserves drilling.

**Why this priority**: Supports self-directed selection and transparency of the adaptive black box; prompt calls it "beautiful searchable word library" (`prompt.md:492-548`).

**Independent Test**: Type `accommodation` in search box, filter category `Studying at college/university`, mastery `weak`; verify filtered list shows only matching entries and detail pane updates on select.

**Acceptance Scenarios**:
1. **Given** 884 words loaded, **When** I search "acid rain" and filter category "the environment", **Then** result count is 1, card shows mastery badge via `tierColor` (`src/pages/Words.tsx:23-36, src/services/scoring.ts:22-31`).
2. **Given** a word has 12 attempts, 5 wrong, mistakeHistogram {repeated:3, vowel:2}, **When** I select it, **Then** detail grid shows Attempts/Correct/Wrong, tier badge + accuracy, best/current streak, avgResponseMs, lastPracticedISO, histogram badges (`src/pages/Words.tsx:118-142`).
3. **Given** list would exceed 400, **When** filter is too broad, **Then** UI caps at 400 and shows "Showing first 400 — refine search." (`src/pages/Words.tsx:35,97`).

---

### User Story 5 — Settings, import/export, daily goal & streaks (Priority: P2)

As a sole owner of a local-first product, I want to configure appearance/audio/practice preferences, set/see daily goal progress, and backup/restore my history as JSON so I never lose it and can move devices.

**Why this priority**: Local-first without backup is risky (prompt: `Refresh MUST NOT erase anything` 737 + Import/Export 742-757). Daily goal + streak are habit levers Duolingo-style.

**Independent Test**: Change theme light→dark, toggle sound off, set dailyGoal 50, export JSON, reset, import same JSON, assert progress restored, dailyProgress ring updates.

**Acceptance Scenarios**:
1. **Given** I toggle theme to dark in Settings, **When** updateSettings runs, **Then** `documentElement.classList.toggle("dark", isDark)` and persisted envelope reflects theme system/dark (`src/store/useAppStore.ts:277-283`).
2. **Given** I click Export Progress, **When** handler fires, **Then** a Blob JSON downloads as `lexis-backup-YYYY-MM-DD.json` via `exportEnvelope` (`src/pages/Settings.tsx:18-26, src/services/storage.ts:76`).
3. **Given** today count 27/30 goal, **When** sidebar daily bar renders, **Then** GSAP `scaleX(0.9)` animates bar and subtitle shows "3 more to goal" or "Goal reached" (`src/components/layout/AppShell.tsx:28-86`).
4. **Given** I practised yesterday and today, **When** `updateStreak()` runs after an attempt, **Then** `streak.current` increments vs resetting to 1 if gap >1 day, and `longest` updates (`src/store/useAppStore.ts:206-234`).

---

### User Story 6 — Visual analytics & gamification (Priority: P3)

As a motivated learner, I want charts (Accuracy over time, Mastery distribution, Activity heatmap, Mistake types, Category performance) and tasteful gamification (XP, level via sqrt(xp/120)+1, achievements) to stay motivated without childishness.

**Why this priority**: Prompt asks for beautiful charts + tasteful gamification (Duolingo engagement but not childish) (`prompt.md:598-627, 421-457`). Valuable for retention but not blocking core drill loop.

**Independent Test**: With 14 days of attempts, open Statistics; verify LineChart accuracy series length 14, Pie mastery slices sum to 884, heatmap 35 days grid, Bar mistake breakdown sorted desc, category bar top 8 by total.

**Acceptance Scenarios**:
1. **Given** 30 attempts over last 14 days, **When** `accuracyOverTime(attempts,14)` is called, **Then** last 14 distinct dates sorted asc with accuracy = correct/total*100 (`src/services/statistics.ts:3-16`).
2. **Given** XP 480, **When** `levelFromXp` and `xpProgress` compute, **Then** level = floor(sqrt(480/120))+1 = 3, pct = (480-480)/(...) style via `xpForLevel` (`src/services/scoring.ts:72-86`).
3. **Given** 6 achievements earned (first100, streak7, streak20, master500, practice1000, perfect) via `checkAchievements`, **When** achievements are checked on completeSession, **Then** personalBests bestAccuracy/bestStreak/fastestAvgMs also update (`src/store/useAppStore.ts:264-275`).

---

### Edge Cases

- Empty corpus: `WORD.length===0` returns empty pool — Practice shows "No words available. Start practice" (`src/pages/Practice.tsx:235-241`).
- No attempts yet: Dashboard says "Start your first session — your adaptive review will learn…" (51-87), Statistics shows "No data yet" card (64-68), Mistakes shows empty ✓ state (37-42), Words shows "Not practiced yet" detail (145-150).
- Offline / SpeechSynthesis unavailable: `audioService.speak` guards `typeof window` + `"speechSynthesis" in window`, resolves promise without crash (`src/services/audio.ts:68-87`).
- Stale voice list: onvoiceschanged listener + 800ms fallback ensures voice picked eventually (`src/services/audio.ts:7-30`).
- IDB failure: loadEnvelope falls back to localStorage, saveEnvelope always mirrors to LS (`src/services/storage.ts:50-74`).
- Attempts overflow: push then slice(-5000) keeps last 5000 (`src/store/useAppStore.ts:129, src/services/storage.ts:86`).
- Rapid typing: input `onChange` differentiates add vs backspace and plays typeTick/typeBackspace per char (`src/pages/Practice.tsx:172-194`).
- Theme = system: respects `prefers-color-scheme: dark` media query (`src/store/useAppStore.ts:280-282`).
- Reduced motion: progress bar sets transform directly without GSAP where `shouldReduceMotion` true (`src/pages/Practice.tsx:80-83, src/pages/Dashboard.tsx:35-36`).
- Timezone: dailyProgress keys are local `todayISO()` via getFullYear/getMonth/getDate (not UTC) but some components use `toISOString().slice(0,10)` (UTC) — potential drift across midnight (see Gaps).
- Import invalid JSON: `importJson` throws "Invalid envelope version/structure" if version!==1 or missing wordProgress/settings (`src/services/storage.ts:80-85`).

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a `/practice` route as the heart, removing distractions in that mode, with audio play/replay/slow, typing input, Check → feedback → Next loop, no page reload between words — [source: prompt.md:132-193, src/pages/Practice.tsx:272-423].
- **FR-002**: System MUST evaluate answers via `analyzeMistake(normalizedExpected, typedRaw)` returning `isCorrect`, `mistakeType` (8-way) and distance; feedback must show your answer, correct spelling (letter-staggered reveal), and mistakeLabel for wrong type — [source: src/services/mistakeAnalysis.ts:46, src/pages/Practice.tsx:106-137].
- **FR-003**: System MUST maintain per-word `WordProgress` with attempts/correct/wrong/masteryScore 0-100/masteryTier/currentStreak/bestStreak/lastPracticedISO/avgResponseMs/totalResponseMs/mistakeHistogram/lastMistakeType — [source: src/types/progress.ts:12-26].
- **FR-004**: System MUST compute mastery tier via getTier: ≥95 mastered, ≥80 strong, ≥60 learning, ≥40 weak, else critical — [source: src/services/scoring.ts:3-9, prompt.md:293-304].
- **FR-005**: System MUST update masteryScore on attempt: +6 correct (+2 if streak≥3, dampened to +4 at 80-94, +2 at 95+), -12 wrong (-2 if prevScore≤50, -3 if ≤30) clamped 0-100 — [source: src/services/scoring.ts:33-48].
- **FR-006**: System MUST implement adaptive review `selectNextWords` with weighted sampling (masteryFactor, failFactor, recency, accBoost, streakPenalty + jitter) for modes smart/normal+adaptive; support mistakes/weak pools, random/quick10/challenge50 fallbacks — [source: src/services/adaptiveReview.ts:45-107].
- **FR-007**: System MUST persist all progress locally via IndexedDB (`idb` 8) + localStorage mirror under key `ielts-spelling-envelope-v1`, with export/import JSON and reset — [source: src/services/storage.ts:5-94, prompt.md:742-757].
- **FR-008**: System MUST provide Dashboard answering "How are you doing?" with today's words, today's accuracy, total practiced/attempts, current/longest streak, XP/level/words mastered/weak words/practice time, weakest 6, recent 3 sessions, daily goal ring — [source: prompt.md:396-417, src/pages/Dashboard.tsx:51-170].
- **FR-009**: System MUST provide `/words` library with search (normalized.includes), category dropdown (36 cats via CATEGORIES), mastery filter (all/critical/weak/learning/strong/mastered/untouched/recentlyWrong) capped at 400 render, and detail pane with attempts/history/histogram — [source: prompt.md:492-548, src/pages/Words.tsx:13-159].
- **FR-010**: System MUST provide Mistakes & Weaknesses view with breakdown per mistakeType, weak-words grid (sorted masteryScore), recent mistakes list (20) filtered `!isCorrect` — [source: prompt.md:368-394, src/pages/Mistakes.tsx:1-113].
- **FR-011**: System MUST provide Statistics with 5 charts: Accuracy over time (Line 14 days), Mastery pie, 35-day Activity heatmap, Mistake Types bar, Category performance horizontal bar (top 8) — [source: prompt.md:420-457, src/pages/Statistics.tsx:12-152].
- **FR-012**: System MUST provide audio: SpeechSynthesis with en-GB Google preferred voice, rate 0.9/0.62 slow, volume 0-1, plus Web Audio chime tones for correct/wrong/streak/complete — [source: src/services/audio.ts:1-121, prompt.md:194-223].
- **FR-013**: System MUST support keyboard-first shortcuts: Enter Submit/Next, Space Play (when not typing), R Slow, plus (to be fixed) N Next and Esc Exit — [source: prompt.md:630-647, src/pages/Practice.tsx:196-232].
- **FR-014**: System MUST implement gamification: XP per correct 10 +2 if <2500ms +3 if <1500ms +1 if wrong, streak bonuses +5 at best≥5 +10 at ≥10; level = floor(sqrt(xp/120))+1; achievements first100/streak7/streak20/master500/practice1000/perfect — [source: src/services/scoring.ts:50-70, src/store/useAppStore.ts:264-274].
- **FR-015**: System MUST support daily goal (select 10/20/30/50/100 or custom 5-200) + streak (current/longest/practiceDays/totalSessions/history YYYY-MM-DD) updated after each attempt — [source: src/types/progress.ts:63-82, prompt.md:551-595].
- **FR-016**: System MUST have premium shell navigation: Dashboard/Practice/Mistakes/Words/Statistics/Settings, responsive sidebar lg:flex 260px, mobile drawer 84% with GSAP slide, topbar sticky 56/64px, footer with shortcuts hint — [source: src/components/layout/AppShell.tsx:10-234, prompt.md:780-798].
- **FR-017**: System MUST respect `prefers-reduced-motion` for all GSAP/framer animations, provide visible focus states, semantic HTML, ARIA labels, accessible contrast per prompt design direction — [source: prompt.md:82-85, 872-885, src/pages/Practice.tsx:25-93].
- **FR-018**: System MUST render proper empty, loading, and transition states: skeletons (AppShell loader spinner), "No words available", "No data yet", "No weaknesses yet" — [source: prompt.md:804-848, src/components/layout/AppShell.tsx:206-214].
- **FR-019**: Word data MUST be AUTO-GENERATED from IELTS MD via `scripts/parse-words.mjs gen:words` into `src/data/words.ts` with id/word/normalized/category/categorySlug/difficulty, 36 categories preserved — [source: prompt.md:460-487, scripts/parse-words.mjs:117-148].
- **FR-020**: Build MUST pass `tsc -b --noEmit` with zero errors and Vite build via `tsc -b && vite build` — [source: package.json:8, bash typecheck 2026-09-07 0 errors].

### Key Entities

- **Word**: { id (slug), word (display), normalized (lowercase), category, categorySlug, difficulty {easy|medium|hard}} — 884 corpus entries, source hash d858b220ce03 — [source: src/data/words.ts:16-27]
- **WordProgress**: per-word state keyed by wordId, aggregates attempts/correct/wrong/masteryScore/tier/streaks/timing/histogram — drives adaptive weight and UI badges — [source: src/types/progress.ts:12-26]
- **Attempt**: atomic practice event {id, wordId, timestampISO, typed/normalizedTyped, isCorrect, mistakeType?, responseMs, mode} — persisted array capped 5000, basis for accuracy/mistake breakdown/category perf — [source: src/types/progress.ts:28-38, src/store/useAppStore.ts:117-129]
- **Session**: {id, mode, startedAt/endedAt, wordIds[], results[] ({wordId, correct, mistakeType, responseMs}), correctCount/wrongCount/avgResponseMs/xpEarned} — groups attempts for session summary & heatmap — [source: src/types/progress.ts:50-61, src/store/useAppStore.ts:150-169]
- **Streak**: {current, longest, lastPracticeDateISO YYYY-MM-DD, practiceDays, totalSessions, history[]} — daily habit tracking, updated via gap logic — [source: src/types/progress.ts:63-70, src/store/useAppStore.ts:206-234]
- **Gamification**: {xp, level, achievements [{id, unlockedAt}], personalBests {bestAccuracy, bestStreak, fastestAvgMs}} — derived from scoring.ts — [source: src/types/progress.ts:96-102, src/services/scoring.ts:50-86]
- **Settings**: {theme light|dark|system, soundEnabled, volume 0..1, autoPlay, slowRate, dailyGoal, defaultMode, adaptiveEnabled, sessionLength} — persisted, drives audio & adaptive & UI — [source: src/types/progress.ts:72-82, src/services/storage.ts:24-34]
- **StorageEnvelope v1**: versioned container {version, exportedAt, wordsMeta {count, sourceHash}, wordProgress map, attempts[], sessions[], streak, gamification, settings, dailyProgress map} — synced IDB+LS — [source: src/types/progress.ts:103-114]

## Success Criteria

- **SC-001**: Learner can complete a 20-word Listen & Type session in <6 minutes with ≤2 page reloads (SPA navigation), average 2500ms response, and see immediate feedback within 200ms of Check click — [measure via session avgResponseMs + UX observation].
- **SC-002**: Adaptive weighting demonstrably surfaces critical words: after seeding 5 critical (score<40) + 10 mastered (95+), next Smart sample of 20 contains ≥60% critical/weak vs <25% in random baseline over 100 runs (Monte Carlo).
- **SC-003**: Spelling accuracy improves over 14 days: accuracyOverTime trend line slope positive ≥+5pp from day 1 to day 14 for a learner practising daily goal (30 words/day).
- **SC-004**: 0 TypeScript errors (`npm run typecheck`), Lighthouse performance ≥90, accessibility ≥95, build via `npm run build` succeeds.
- **SC-005**: All data survives refresh: after practising 5 words, refreshing, and reloading, attempts/sessions/wordProgress/streak remain (IDB+LS persistence).
- **SC-006**: Keyboard-only flow complete: learner can play/replay/next/escape using only Space/R/Enter/N/Esc without mouse, input auto-focus on word change.
- **SC-007**: Empty states never blank: Dashboard/Mistakes/Statistics/Words each show human empty CTA when no data, as verified by fresh install.
- **SC-008**: Reduced motion respected: with OS "Reduce motion" on, GSAP transitions are disabled and progress bars set directly without animation (no motion nausea).

## Assumptions

- Single personal user; no multi-user/auth needed; local-first is acceptable long-term — [source: prompt.md:715-718].
- 884 words after dedup is acceptable canonical size; not required to hit exactly 1200 — noisy phrases retained as-is unless clarified (see research Gaps).
- Browser SpeechSynthesis quality is "good enough" for IELTS words; no pre-recorded audio pipeline in v1 — fallback chimes only via Web Audio.
- Daily goal default 30, sessionLength default 20 are reasonable; user can customise 5-200 — [source: src/services/storage.ts:30,33].
- Tailwind design tokens (surface-2/3, accent, muted) plus one accent colour satisfy "sophisticated neutral base" without full Figma spec.
- No backend sync; import/export JSON is sufficient backup until proven otherwise.
- three.js/fiber/drei dependencies are unused legacy or for AmbientBackground canvas effects; may be pruned later.
- Difficulty by length heuristic is temporary until frequency/syllable data replaces it.

## Out of Scope for v1 (explicit)

- Cloud sync / accounts / sharing streaks socially.
- Spaced-repetition scheduler (SM-2/FSRS) beyond masteryScore + recency weighting.
- Pre-recorded audio or paid TTS integration.
- Mobile native app / offline PWA install prompt (beyond 100dvh responsive web).
- Full WCAG audit tooling (axe/Pa11y) — manual a11y only in this pass.
