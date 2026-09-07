# Feature Specification: Premium IELTS Spelling Training Web App

**Feature Branch**: `001-ielts-spelling`

**Created**: 2026-09-07

**Status**: Draft

**Input**: Premium personal IELTS spelling trainer – polished, addictive, intelligent local-first web app built from 1200 most commonly repeated IELTS listening words.

## User Scenarios & Testing

### User Story 1 – Focused Spelling Practice (Priority: P1)

As a learner, I can practice spelling in a distraction-free `/practice` experience: hear / see a word, type spelling, submit, get immediate animated feedback (correct/wrong + mistake type), and move to next word without reload.

**Why this priority**: Core learning loop; everything else (analytics, mastery, adaptive) depends on it.

**Independent Test**: Launch practice with 10 words, complete full cycle for each word, verify no page reload, keyboard-only flow (Enter to submit, N/next, Space to play audio).

**Acceptance Scenarios**:

1. Given I start Normal Practice, When a word is shown, Then I can type and press Enter to get correct/wrong feedback with smooth animation and stats update.
2. Given I answer incorrectly, When feedback shows, Then I see my typed value, correct spelling, detected mistake type (e.g., "Missing letter"), and mastery change.
3. Given I am in practice, When I press Space, Then pronunciation replays; R replays slow version; Esc exits; N advances after feedback.

---

### User Story 2 – Listen & Type (IELTS Listening Simulation) (Priority: P1)

As a learner, I can enter "Listen & Type" mode where the written word is hidden and only audio is provided, simulating IELTS listening spelling section.

**Why this priority**: Core differentiation – audio-first practice is the IELTS use case.

**Independent Test**: Start Listen & Type, verify word text is hidden, audio auto-plays, slow playback works, reveal after submit shows correct spelling.

**Acceptance Scenarios**:

1. Given Listen & Type active, When word loads, Then only audio button + "Listen carefully" placeholder visible, not spelling.
2. Given I submit answer, When evaluated, Then UI reveals correct spelling with diff highlighting.

---

### User Story 3 – Intelligent Adaptive Review & Mastery (Priority: P1)

As a learner, the app prefers my weak words (frequent wrong, recent wrong, low accuracy, long-unpracticed) and de-prioritises mastered words via a transparent mastery score (0-100).

**Why this priority**: Personalization is the value over random flashcards.

**Independent Test**: Practice same word incorrectly 3x and another correctly 5x; start Smart Practice; weak word appears with significantly higher frequency.

**Acceptance Scenarios**:

1. Given mastery levels (0-39 Critical, 40-59 Weak, 60-79 Learning, 80-94 Strong, 95-100 Mastered), When I view any word, Then its mastery tier is visible.
2. Given Smart Practice, When next word is chosen, Then algorithm weights recency, accuracy, fail count, and days-unpracticed.

---

### User Story 4 – Mistake Intelligence (Priority: P2)

As a learner, when I misspell, the app classifies *why* (missing letter, extra letter, wrong letter, transposition, repeated-letter, vowel/consonant error, multiple) and aggregates this in statistics.

**Why this priority**: Turns binary correct/wrong into actionable insight.

**Independent Test**: Type "accomodation" for "accommodation" → tagged as Repeated-letter; "nesessary" for "necessary" → Wrong letter; view Mistake Types chart.

**Acceptance Scenarios**:

1. Given wrong answer, When analyzed, Then feedback shows one precise category with colored chips.
2. Given Statistics page, When I have 20 mistakes, Then Mistake Types breakdown chart reflects real distribution.

---

### User Story 5 – Dashboard & Visual Analytics (Priority: P2)

As a learner, my dashboard immediately answers "How am I doing?" with today's words/accuracy, totals, streak, XP/level, mastered/weak counts, plus charts: accuracy over time, heatmap, mastery distribution, mistake types, category performance.

**Why this priority**: Daily motivation and visibility.

**Independent Test**: After a session, dashboard cards and charts update without refresh; zero-state shows "Start your first session".

**Acceptance Scenarios**:

1. Given first visit, When no data, Then empty states with CTAs appear, not blank screens.
2. Given 7 days of practice, When viewing dashboard, Then activity heatmap (GitHub-style) and accuracy line chart render.

---

### User Story 6 – Word Library, Weakest Words, Details (Priority: P2)

As a learner, I can browse all ~884 words with search/category/mastery filters, see weakest words ranked, and open a word detail with attempts, accuracy, streaks, avg response time, last practiced, history.

**Why this priority**: Browsing and targeted review before practice.

**Acceptance Scenarios**:

1. Given /words, When I filter by "Weak" or search "accommodation", Then list updates instantly.
2. Given weakest words list, When I click a word, Then detail drawer/page shows full history and quick "Practice this word" action.

---

### User Story 7 – Gamification, Streak, Daily Goal (Priority: P3)

As a learner, I earn XP/levels, keep a daily streak, set daily goal (10/20/30/50/100/custom) with progress ring, and unlock achievements (First 100, 7-day streak, 100% accuracy, XP milestones).

**Why this priority**: Retention without childish design.

**Acceptance Scenarios**:

1. Given daily goal 30, When I practice 18 words, Then ring shows 60% and "12 more to goal".
2. Given I complete goal, When final word is correct, Then subtle completion animation fires (not flashy).
3. Given streak, When I practice on consecutive UTC days, Then streak increments; missing a day breaks it and updates longest streak.

---

### User Story 8 – Settings, Import/Export, Local-First Persistence (Priority: P3)

As a learner, all progress persists locally (IndexedDB/localStorage) across refreshes; I can export JSON, import, reset with confirmation; settings control theme, sound, volume, autoplay, slow TTS, goal, defaults.

**Why this priority**: Trust and control for a personal app.

**Acceptance Scenarios**:

1. Given I practice 5 words and refresh, When app loads, Then stats/words/history are intact.
2. Given Export, When I download JSON and Reset, Then Import restores identical state.

---

### Edge Cases

- Empty practice pools: Quick 10 / Challenge 50 when < required words → fall back to available + message.
- Listen & Type with speech synthesis unavailable → fallback to spelled reveal + banner.
- Phrase words ("credit card", "greenhouse effect") → input accepts case-insensitive, trims; feedback highlights spacing/punctuation diffs.
- Reduced motion enabled → all animations degrade to opacity fades (no transform).
- Offline → app fully functional (client-only); no network errors.
- Massive 884-word list search → debounced input, virtualized list.
- Audio autoplay blocked by browser → show explicit Play button.
- Import of corrupted JSON → validation error, no state corruption.
- XSS in word list (unlikely) → sanitized rendering.
- Rapid keystrokes → no expensive recompute per keystroke; validation only on submit.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide practice loop (present → type → submit → animated feedback → next) without page reload on `/practice`.
- **FR-002**: System MUST provide 8 practice modes: Normal, Listen&Type, Mistake-only, Weak Words, Quick 10, Challenge 50, Random, Smart (adaptive).
- **FR-003**: System MUST generate mastery score 0-100 per word with tiers Critical/Weak/Learning/Strong/Mastered and persist.
- **FR-004**: System MUST implement adaptive selection weighting wrong-frequency, recency, accuracy, fail streak, days-unpracticed.
- **FR-005**: System MUST classify mistake type via edit-distance logic (missing, extra, wrong, transposition, repeated-letter, vowel, consonant, multiple).
- **FR-006**: System MUST provide TTS pronunciation via Web Speech API with replay, slow rate, auto-play toggle, sound ON/OFF, volume, correct/wrong/streak chimes (subtle).
- **FR-007**: System MUST persist locally (IndexedDB preferred with localStorage fallback) all progress: attempts, mistakes, streak, XP, level, settings, daily goal, session history, mastery.
- **FR-008**: System MUST expose Dashboard metrics: today's words/accuracy, total practiced/attempts, streak/current+longest, XP/level, mastered/weak/untouched, practice time, plus charts for accuracy over time, heatmap, mastery distribution, mistake types, category performance.
- **FR-009**: System MUST provide `/words` library with search + filters (category, mastery tier, weak/mastered/untouched/recently wrong/frequently wrong).
- **FR-010**: System MUST provide Word Detail view with pronunciation, category, attempts/correct/wrong, accuracy, streaks, avg response time, last practiced, mistake patterns, history list.
- **FR-011**: System MUST allow daily goal setting (10/20/30/50/100/custom) with circular progress and tasteful completion animation.
- **FR-012**: System MUST track streak (current, longest, practice days, total sessions) with visualization.
- **FR-013**: System MUST implement gamification XP/levels/achievements/personal records with non-childish UI.
- **FR-014**: System MUST support keyboard-shortcuts: Enter submit, Space play, R replay slow, N next, Esc exit, with auto-focus on input.
- **FR-015**: System MUST show session summary after mode completion (words, correct/wrong, accuracy, avg time, XP, streak, weakest words, mistake types, delta vs previous session).
- **FR-016**: System MUST provide Settings page (theme light/dark/system, sound, volume, auto-play, slow TTS, daily goal, default mode, session length, adaptive toggle, shortcut hints).
- **FR-017**: System MUST provide Import/Export JSON and Reset with confirmation, plus app shell navigation (Dashboard, Practice, Mistakes, Words, Statistics, Settings) responsive (sidebar + mobile drawer).
- **FR-018**: System MUST handle phrases, case-insensitive matching, trimmed whitespace, and accessory UI for multi-word entries.
- **FR-019**: System MUST implement accessibility: keyboard nav, focus states, semantic HTML, ARIA, contrast, screen reader, prefers-reduced-motion.
- **FR-020**: System MUST parse provided IELTS MD file programmatically (no manual 1200 entries) into structured `Word {id, word, category, difficulty?}`.

### Key Entities

- **Word**: {id, word (display), normalized (lower), category, difficulty?, canonicalPronunciation?} — source of truth, ~884 records.
- **WordProgress**: {wordId, attempts, correct, wrong, masteryScore 0-100, masteryTier, currentStreak, bestStreak, lastPracticedISO, avgResponseMs, mistakeTypeHistogram}.
- **Attempt**: {id, wordId, timestampISO, typed, isCorrect, mistakeType, responseMs, mode}.
- **Session**: {id, mode, startedAt, endedAt, words:[wordId], correctCount, wrongCount, avgResponseMs, xpEarned, mistakeTypeBreakdown}.
- **Streak**: {current, longest, lastPracticeDateISO, practiceDays, totalSessions, history:[dateISO]}.
- **Settings**: {theme:"light"|"dark"|"system", soundEnabled, volume 0-1, autoPlay, slowRate, dailyGoal, defaultMode, sessionLength, adaptiveEnabled}.
- **DailyGoalProgress**: {dateISO, count, goal}.
- **Gamification**: {xp, level, achievements:[{id, unlockedAt}], personalBests:{bestAccuracy, bestStreak, etc}}.
- **StorageEnvelope**: versioned JSON for import/export containing all above.

## Success Criteria

- **SC-001**: User completes 10-word practice session in <3 minutes end-to-end (keyboard-only) without reloading.
- **SC-002**: Adaptive Smart mode surfaces a word with <60% accuracy ≥3× more often than a >90% word (verified via simulation).
- **SC-003**: 95% of misspellings receive correct dominant mistake type on first classification (manual spot-check 100 pairs).
- **SC-004**: App loads in <1.5s on mid-tier mobile (Lighthouse performance ≥90) and stays <100ms input latency.
- **SC-005**: Refresh after session does not lose any data (persist verified).
- **SC-006**: Users can set goal, hit it, see celebration, and see next day’s progress reset.
- **SC-007**: 90% of first-time users can find and start Listen & Type without help (heuristic).
- **SC-008**: All pages usable keyboard-only and pass axe-core contrast/focus checks.
- **SC-009**: Word library search/filter returns results in <100ms for 884 entries.

## Assumptions

- Single-user personal app; no auth, no backend, no sync.
- Browser supports LocalStorage and SpeechSynthesis; fallback graceful.
- IELTS MD file is single source word list; categories derived from its headings; phrases treated as valid entries.
- XP/level simple curve (e.g., level = floor(sqrt(xp/100)) or linear) – configurable.
- SpeechSynthesis voices vary by OS; we pick best available English voice.
- System date controls streak; timezone local.
- Phrases preserved with spaces; difficulty optional initial, can be derived later.
