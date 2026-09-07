# Tasks: Premium IELTS Spelling Training Web App — Production-Ready Public Multi-User Local-First

**Input**: `specs/001-ielts-spelling/spec.md` (8 stories) + `prompt.md` (35 sections) + `plan.md` + `research.md` + `data-model.md` + `contracts/` + `quickstart.md`
**Branch**: `001-ielts-spelling` | **Date**: 2026-09-07
**Stack**: React 19 + React Router 7 + Vite 8 + Zustand 5 + idb 8 + vite-plugin-pwa + Tailwind 3.4

**Tests**: No automated test suite in spec — tasks include `typecheck`/`build` gates + manual E2E per `quickstart.md`. Add optional contract/unit tasks where noted.

**Organization**: Foundational blocks all stories; US1-US8 from spec.md (priority ordered) then US9-US11 for prompt upgrade (onboarding/profile, data management, hosting/cache/offline). Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency)
- **[Story]**: US1..US11 traceability
- Include exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and project scaffolding for production upgrade

- [ ] T001 Create PWA dependencies and verify build in `package.json` (`vite-plugin-pwa` + `workbox-window`)
- [ ] T002 [P] Create `public/manifest.webmanifest` with name `Lexis — IELTS Spelling`, `display:standalone`, icons, `theme_color`
- [ ] T003 [P] Update `index.html` to add `<link rel="manifest" href="/manifest.webmanifest">`, `theme-color` meta, `apple-touch-icon`
- [ ] T004 [P] Create deployment fallback config `vercel.json` (rewrites `/* → /index.html`) and `public/_redirects` (`/* /index.html 200`)
- [ ] T005 Configure `vite.config.ts` to import `VitePWA` (generateSW, registerType prompt, globPatterns, runtimeCaching for google fonts & /api/dictionary)
- [ ] T006 Create storage abstraction directory `src/storage/` and placeholder `src/storage/README.md` documenting envelope ownership

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core local-first data layer that all stories depend on — MUST complete before any US work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Extend `src/types/progress.ts` with `UserProfile {id,name,onboardingCompleted,createdAt,updatedAt}` and add `userProfile: UserProfile` to `StorageEnvelope`
- [ ] T008 [P] Create `src/storage/storageKeys.ts` with `STORAGE_VERSION=1`, `DB_NAME`, `STORE`, `KEY`, `LS_KEY`, `CACHE_NAME` per `contracts/storage-keys.md`
- [ ] T009 [P] Create `src/storage/userStorage.ts` (`getUserProfile/saveUserProfile/updateUserProfile/clearUserProfile`) delegating to envelope
- [ ] T010 [P] Create `src/storage/progressStorage.ts` (`getProgress/saveProgress/clearProgress/getStatistics`) per `contracts/storage-keys.md`
- [ ] T011 [P] Create `src/storage/settingsStorage.ts` (`getSettings/updateSettings`) and `src/storage/wordStorage.ts` (`getCustomWords/saveCustomWord/deleteCustomWord`)
- [ ] T012 Refactor `src/services/storage.ts` to use `storageKeys.ts`, add `migrateEnvelope` for `userProfile` back-compat, enhance `safeParse` + `simpleSanitize`, ensure IDB→LS→default fallback never crashes
- [ ] T013 Extend `src/services/storage.ts` `defaultEnvelope()` to include `userProfile {id:"local-user",name:"",onboardingCompleted:false,createdAt:ISO,updatedAt:null}` and update `exportJson`/`importJson`/`resetEnvelope` validation (version + required keys + attempts cap 5000 + re-derive tier)
- [ ] T014 Extend `src/store/useAppStore.ts` state with `userProfile` selectors, actions `updateUserProfile`, `completeOnboarding`, `clearProgress`, `clearAllData`, plus `BroadcastChannel`+`storage` event multi-tab sync and `persist` guards (try/catch per research §9)
- [ ] T015 [P] Create `src/hooks/useProfile.ts` (selectors for `name`, `onboardingCompleted`, `updateName`) and `src/hooks/useStorageSync.ts` (BroadcastChannel + storage listener)
- [ ] T016 Configure error recovery UI toast/banner for `src/services/storage.ts` failures — show "We couldn't access your local data..." without crashing, in `src/components/layout/AppShell.tsx`
- [ ] T017 Verify `src/services/adaptiveReview.ts` `recentGlobal` remains in-memory only (no envelope bloat) and document in comments

**Checkpoint**: Foundation ready — envelope versioned, profile persisted, sync wired, audit passes `tsc -b --noEmit`

---

## Phase 3: User Story 1 — Focused Spelling Practice (Priority: P1) 🎯 MVP

**Goal**: Distraction-free `/practice` loop: present → type → submit → animated feedback (correct/wrong + mistake type) → next without reload, keyboard-only (Enter/N/Space/R/Esc)

**Independent Test**: Start `Normal` practice with 10 words, complete full cycle for each, verify no reload, Enter submits, N next, Space plays, Esc exits; only submitted attempts count toward stats

- [ ] T018 [P] [US1] Audit `src/pages/Practice.tsx` ensures `recordAttempt` called only on `handleCheck` (not on display) and `startedAt→responseMs` measured per word in `src/pages/Practice.tsx`
- [ ] T019 [US1] Verify session lifecycle in `src/store/useAppStore.ts` (`startSession` on mount, `completeSession` on exhaustion) respects `settings.sessionLength` and `adaptiveEnabled`
- [ ] T020 [US1] Ensure `src/pages/Practice.tsx` feedback uses `src/services/mistakeAnalysis.ts` `analyzeMistake` + `mistakeLabel` and shows typed vs correct with diff
- [ ] T021 [US1] Validate keyboard shortcuts in `src/pages/Practice.tsx` (Enter submit/next, Space play, R slow, N next, Esc navigate "/") with `useAudio.ts` focus management
- [ ] T022 [US1] Run `quickstart.md` §2 practice loop — 10 words end-to-end <3 min, no reload, per-keystroke does NOT trigger `saveEnvelope` (verify via LS timestamp)

**Checkpoint**: US1 fully functional and independently testable; Practice remains usable offline if audio cached

---

## Phase 4: User Story 2 — Listen & Type (IELTS Listening Simulation) (Priority: P1)

**Goal**: Audio-first mode where written word is hidden, only audio provided

**Independent Test**: Start `Listen & Type`, verify word text hidden, audio auto-plays (or Play button if blocked), slow playback works, reveal after submit shows correct spelling

- [ ] T023 [P] [US2] Ensure `src/pages/Practice.tsx` `activeMode==="listen"` hides spelling, shows "Listen carefully" placeholder and large audio button
- [ ] T024 [US2] Wire auto-play in `src/pages/Practice.tsx` with `src/hooks/useAudio.ts` + `src/services/audio.ts` respecting `settings.autoPlay/soundEnabled/volume/slowRate`, fallback banner if `speechSynthesis` unavailable
- [ ] T025 [US2] Test `src/services/audio.ts` `speak(word, slow)` rate `0.62` slow / `0.9` normal, `cancel()` before speak, `onvoiceschanged` 800ms fallback per `research.md`

**Checkpoint**: US1 + US2 both work; audio gracefully degrades

---

## Phase 5: User Story 3 — Intelligent Adaptive Review & Mastery (Priority: P1)

**Goal**: Weak words surfaced 3× more often via mastery 0-100 and weighted priority

**Independent Test**: Practice word A wrong 3× and word B correct 5×; Smart mode surfaces A significantly more frequently (100 trials count)

- [ ] T026 [P] [US3] Verify `src/services/adaptiveReview.ts` `calculatePriority` weighting (wrong×, accuracy, consecutiveWrong, recency, gapDays, overdue `nextReviewAt`, state, recent penalty) and `getNextWord` softmax + `recentGlobal` gap 5–10
- [ ] T027 [US3] Verify `src/services/adaptiveReview.ts` `deriveWordState`, `calculateMastery` (acc*55 + streakBonus + stability + speed + recency), `calculateNextReviewAt` (1→3→7→14→30 days correct, 0.15–1 day wrong)
- [ ] T028 [US3] Ensure `src/services/adaptiveReview.ts` `selectNextWords` modes `mistakes`/`weak` pool correctly and `adaptiveEnabled` toggle in `src/store/useAppStore.ts` respects `settings.adaptiveEnabled`
- [ ] T029 [US3] Ensure `src/store/useAppStore.ts` `recordAttempt` updates `WordProgress` mastery/state/historicalMastery/nextReviewAt and persists via `saveEnvelope` (adaptive state survives reload)

**Checkpoint**: Adaptive persists across refresh; Smart mode spec SC-002 validated via simulation

---

## Phase 6: User Story 4 — Mistake Intelligence (Priority: P2)

**Goal**: Classify *why* misspelled (8 types) and aggregate

**Independent Test**: `accomodation→accommodation` = `repeated`, `nesessary→necessary` = `wrong`; Mistake Types chart reflects real distribution after 20 mistakes

- [ ] T030 [P] [US4] Validate `src/services/mistakeAnalysis.ts` `analyzeMistake` cases (missing/extra len diff, transposition, single-substitution repeated/vowel/consonant, multi) with Levenshtein+Damerau, 95% target spot-check
- [ ] T031 [US4] Ensure `src/pages/Practice.tsx` displays `mistakeLabel`/`mistakeColor` chip and `src/services/statistics.ts` `mistakeBreakdown` aggregates by `attempts.filter(!isCorrect)`
- [ ] T032 [US4] Ensure `src/pages/Mistakes.tsx` and `src/pages/Statistics.tsx` render real breakdown (no mock) from `envelope.attempts`

**Checkpoint**: Mistake intelligence end-to-end

---

## Phase 7: User Story 5 — Dashboard & Visual Analytics (Priority: P2)

**Goal**: Dashboard answers "How am I doing?" with real personal stats, zero-state for new users, charts

**Independent Test**: After session dashboard updates without refresh; first visit shows "Start your first session" with no fake numbers; 7 days shows heatmap + line chart

- [ ] T033 [P] [US5] Refactor `src/pages/Dashboard.tsx` hero to display `How you're doing, {userProfile.name}` (fallback "Good to see you back" if profile missing) and zero-state: if `attempts.length===0` show "You haven't practiced yet. Start your first practice session to build your progress." per prompt §5
- [ ] T034 [US5] Ensure `src/pages/Dashboard.tsx` stats derived from real envelope only: `totalPracticed=Object.keys(wordProgress).length`, `accuracy=correct/attempts.length`, `todayAttempts` via local YYYY-MM-DD conversion, `mastered=filter mastery>=95`, `weak=filter 0-59 && attempts>0`, `practiceMins=sum(totalResponseMs)/60000` via `src/services/statistics.ts`
- [ ] T035 [US5] Remove any hardcoded `109`/`12%` placeholder in `src/pages/Dashboard.tsx` and sweep repo (`grep 109`, `12%`, `dummy/mock/demo`) per prompt §25 — keep fixtures isolated
- [ ] T036 [US5] Verify `src/components/layout/AppShell.tsx` sidebar daily goal ring uses `dailyProgress[today]` and level/xp via `src/services/scoring.ts` `xpProgress`
- [ ] T037 [US5] Ensure `src/pages/Statistics.tsx` charts (`accuracyOverTime`, `heatmapData`, `masteryDistribution`, `mistakeBreakdown`, `categoryPerformance` from `src/services/statistics.ts`) render empty states with CTAs, not blank

**Checkpoint**: Dashboard personalized, zero-state correct, no fake stats, single source of truth verified

---

## Phase 8: User Story 6 — Word Library, Weakest Words, Details (Priority: P2)

**Goal**: Browse ~884 words with search/category/mastery filters, weakest ranked, detail with full history

**Independent Test**: `/words` filter by `Weak` or search `accommodation` → instant; weakest list → detail drawer shows history + Practice action

- [ ] T038 [P] [US6] Verify `src/pages/Words.tsx` `filtered` memo (debounced 250ms, slice 400) uses `src/services/wordRepository.ts` `getAllWords()` (system + `userWords` filtered by `hiddenWordIds`) and `matchesSearch` (Bangla/synonyms/note), per prompt §22 local-first
- [ ] T039 [US6] Ensure filters: category `SYSTEM_CATEGORIES` + user categories, mastery `all/critical/weak/learning/strong/mastered/untouched/recentlyWrong`, source `all/system/my` wired to `envelope.wordProgress` and `envelope.userWords`
- [ ] T040 [US6] Ensure word detail in `src/pages/Words.tsx` shows `src/services/adaptiveReview.ts` `deriveWordState` fields: attempts/correct/wrong, accuracy, streaks, avgResponseMs, lastPracticed, mistakeHistogram, plus dictionary fetch via `src/services/dictionaryService.ts` with offline banner (prompt §13)
- [ ] T041 [US6] Verify weakest list logic: `Object.values(wordProgress).filter(attempts>0).sort(masteryScore asc).slice(6)` and navigation `handleAdded` for new user words

**Checkpoint**: Library instant (<100ms), weakest accurate, custom words visible

---

## Phase 9: User Story 7 — Gamification, Streak, Daily Goal (Priority: P3)

**Goal**: XP/levels, streak, daily goal ring, achievements without childish design

**Independent Test**: Goal 30 → 18 words → ring 60% "12 more"; final word completes → subtle animation; consecutive UTC days → streak increments

- [ ] T042 [P] [US7] Verify `src/services/scoring.ts` `computeXp`/`levelFromXp`/`xpProgress` and `src/store/useAppStore.ts` `completeSession` unlocking achievements `first100/streak7/streak20/master500/practice1000/perfect`
- [ ] T043 [US7] Ensure `src/store/useAppStore.ts` `updateStreak` increments only on `recordAttempt` (not dashboard mount) per data-model, `lastPracticeDateISO` local YYYY-MM-DD, `longest = max`
- [ ] T044 [US7] Ensure daily goal ring in `src/pages/Dashboard.tsx` + sidebar uses `dailyProgress[today].count/goal` and `settings.dailyGoal` (10/20/30/50/100 + custom 5..200)

**Checkpoint**: Gamification persists, streak not fake-inflated

---

## Phase 10: User Story 8 — Settings, Import/Export, Local-First Persistence (Priority: P3)

**Goal**: All progress persists locally across refresh; export/import/reset + settings that actually work; app shell nav responsive

**Independent Test**: Practice 5 words → refresh → intact; Export → Reset → Import restores identical

- [ ] T045 [P] [US8] Audit `src/pages/Settings.tsx` every control against `src/store/useAppStore.ts` `updateSettings`/`settings` fields: theme, soundEnabled, volume, autoPlay, slowRate, dailyGoal, defaultMode, sessionLength, adaptiveEnabled — delete any fake toggle per prompt §14 (if unverified, remove)
- [ ] T046 [US8] Ensure Settings persistence: change → refresh → still set, change → close/reopen → still set (via LS+IDB envelope, `applyTheme` on init)
- [ ] T047 [US8] Verify export/import in `src/pages/Settings.tsx` + `src/services/storage.ts` `exportJson`/`importJson` includes `userProfile/settings/userWords/wordProgress/attempts/sessions/streak/gamification/dailyProgress/metaLearning/activeLearningSession`, validated, attempts capped 5000
- [ ] T048 [US8] Ensure `src/components/layout/AppShell.tsx` init loads envelope, applies theme (system prefers-dark), and responsive sidebar/drawer works 375–1920
- [ ] T049 [US8] Run phrase handling test: `"credit card"` typed `Credit Card` → correct (case-insensitive trim), reduced-motion → opacity fades only

**Checkpoint**: Settings real only, persistence verified, import/export round-trip

---

## Phase 11: User Story 9 — First-Time Onboarding & Returning User (Priority: P1) ★ Prompt §2-3

**Goal**: New browser shows fast name-only onboarding; returning user skips it and sees personalized greeting; name survives refresh/close/reopen/navigation

**Independent Test**: Clear storage → open → onboarding appears; enter `Rahim` → Continue → dashboard shows `Hi, Rahim`; refresh/close/reopen → still `Rahim`; second browser shows onboarding again for `Karim` without mixing (quickstart US2)

- [ ] T050 [P] [US9] Create `src/components/onboarding/Onboarding.tsx` with UI: "Welcome to IELTS Spelling Trainer" / "What's your name?" / input `[ Your name ]` (autoFocus, maxLength 60, sanitized) / `[ Continue ]` button, minimal styling matching existing design
- [ ] T051 [US9] Implement validation in `src/components/onboarding/Onboarding.tsx`: `trim()` whitespace, reject empty, show inline error, on Continue call `useAppStore.completeOnboarding(name)` → `saveUserProfile` → mark `onboardingCompleted:true` → navigate to `/`
- [ ] T052 [US9] Implement gating in `src/components/layout/AppShell.tsx`: `if (!ready) loader; else if (!envelope?.userProfile?.onboardingCompleted) return <Onboarding/>` else `Outlet`; ensure direct `/words`/`/learning`/`/practice` redirect to onboarding if not completed, and `/* → /` fallback remains
- [ ] T053 [US9] Verify persistence: `localStorage["ielts-spelling-envelope-v1"]` and IDB `ielts-spelling-db` contain `userProfile` after Continue; refresh/close/reopen retains; `storage` event + `BroadcastChannel` keeps tabs consistent
- [ ] T054 [US9] Sweep for hardcoded onboarding/demo profile (`testUser/John/Alex`) per prompt §25 and remove if found

**Checkpoint**: First-load flow diagram (§26) validated; no login/backend

---

## Phase 12: User Story 10 — Dashboard Personalization & Zero-Data State (Priority: P1) ★ Prompt §4-5

**Goal**: Dashboard uses real saved name and real stats; new user sees true zero-state, never fake `109`/`12%`/`7 day`

**Independent Test**: New user → `How you're doing, Al A Min` + `You haven't practiced yet...`; after practice → `You've practiced N times with X%` where N/X from real attempts; hardcoded sweep passes

- [ ] T055 [P] [US10] Update `src/pages/Dashboard.tsx` hero to `How you're doing, {userProfile.name}` and ensure `statistics.ts` aggregations drive all cards (no hardcoded numbers)
- [ ] T056 [US10] Implement zero-state branch in `src/pages/Dashboard.tsx`: `attempts.length===0` → message + CTA to `/practice`, stats `0/884`, streak `0`, mastered `0`, weakest empty-state CTA
- [ ] T057 [US10] Verify `src/pages/Statistics.tsx` and sidebar also use real data only; remove fallback `109`/`12%` mocks from any component

**Checkpoint**: Personalization immediate after name edit (Settings → Dashboard without reload)

---

## Phase 13: User Story 11 — Real Progress & Single Source of Truth (Priority: P1) ★ Prompt §6-7

**Goal**: All metrics from persisted data; Practice/Learning/Adaptive/Dashboard/Words/Settings share one `Progress Repository`

**Independent Test**: Practice word `environment` 10× → close → reopen → adaptive remembers; streak not increased by just opening dashboard; words-learned/mastered/weak from actual `wordProgress`/`deriveWordState`

- [ ] T058 [P] [US11] Audit `src/services/statistics.ts` functions `accuracyOverTime/heatmapData/masteryDistribution/mistakeBreakdown/categoryPerformance` to derive from `envelope.attempts`/`wordProgress` only, and document single source diagram in comments
- [ ] T059 [US11] Ensure `src/pages/Practice.tsx`, `src/pages/Learning.tsx`, `src/pages/Words.tsx` all read `useAppStore.envelope` (no duplicate progress stores) and `recordAttempt` only counts submitted answers (not displayed)
- [ ] T060 [US11] Verify adaptive persistence: `src/store/useAppStore.ts` `recordAttempt` persists `consecutiveCorrect/Wrong`, `accuracy`, `masteryScore`, `state`, `lastPracticed`, `nextReviewAt` via `calculateMastery`/`calculateNextReviewAt`; reload → same priority via `calculatePriority`
- [ ] T061 [US11] Run data isolation check: Chrome→Rahim vs Edge→Karim — verify separate `wordProgress`/`attempts` (quickstart US2 step 5)

**Checkpoint**: No duplicated progress logic; every metric traceable to envelope

---

## Phase 14: User Story 12 — Settings Profile & Data Management (Priority: P1) ★ Prompt §15-19

**Goal**: Settings Profile editable name (immediate dashboard update, persists); Data & Privacy with Clear Practice Progress and Clear All Data requiring confirmation; post-clear state verified

**Independent Test**: Settings change name Rahim→Karim → dashboard updates without reload → refresh persists; Clear Practice Progress → practice stats zero but custom word/user name/settings remain → Clear All Data → onboarding reappears, blank, no manual refresh needed

- [ ] T062 [P] [US12] Add Profile section to `src/pages/Settings.tsx`: `Your name [ Al A Min ]` input with Save (or auto-save), calls `updateUserProfile({name:trimmed})` + `persist`, toast, dashboard selector immediate
- [ ] T063 [US12] Create Data & Privacy section in `src/pages/Settings.tsx` with actions `Clear Practice Progress` and `Reset Everything`/`Clear All App Data` using `src/components/ui/Dialog.tsx` (not `confirm()`)
- [ ] T064 [US12] Implement `clearProgress` in `src/store/useAppStore.ts`: reset `attempts`, `sessions`, `wordProgress` (or per-word streak counters), `dailyProgress`, `streak` (current/longest/history), `gamification` personalBests, `metaLearning` wordMethods, `activeLearningSession`; preserve `userProfile.name`, `userWords`, `settings` — persist and refresh dashboard
- [ ] T065 [US12] Implement confirm dialog for Clear Progress: "Clear practice progress? This will permanently remove your practice history and progress. [Cancel] [Clear Progress]" + destructive styling
- [ ] T066 [US12] Implement `clearAllData` in `src/store/useAppStore.ts`: replace envelope with `defaultEnvelope()` (`onboardingCompleted:false`, `userProfile.name=""`, reset all fields), delete IDB + LS entries (try/catch), `BroadcastChannel` notify, set state, navigate to `<Onboarding/>` without reload
- [ ] T067 [US12] Implement Clear All confirm: "This cannot be undone." with red `[ Clear All Data ]` + Cancel, per prompt §18
- [ ] T068 [US12] Verify post-clear checkpoints (prompt §19): dashboard zero, no old name, no custom words, practice history gone, learning/adaptive reset, settings defaults, onboarding appears — automated check in `src/utils/format.ts` helper if needed

**Checkpoint**: Destructive actions require explicit confirmation, never single-click, reset without manual refresh

---

## Phase 15: User Story 13 — Production Hosting, Caching & Offline (Priority: P1) ★ Prompt §11-13, §32

**Goal**: App production-ready for online host; static assets cached, SW safe for updates, offline-first (words/learning/practice/dashboard/settings available offline), stale navigation handled

**Independent Test**: `vite build` → deploy; direct `/words`/`/practice` load OK; refresh OK; SW update toast; offline mode → words/practice/dashboard/settings usable; dictionary offline → graceful banner not crash

- [ ] T069 Update `vite.config.ts` `VitePWA` workbox config per research §7: `globPatterns` js/css/html, `runtimeCaching` google fonts CacheFirst 30d, `/api/dictionary` NetworkFirst 4s, `navigateFallback:index.html`, `registerType:prompt`
- [ ] T070 [P] Ensure `public/manifest.webmanifest` precached and `index.html` links it; verify `vite build` emits `sw.js` + precache manifest hashed
- [ ] T071 [P] Implement SW update prompt in `src/components/layout/AppShell.tsx` (listen `workbox-window` `waiting` → toast "New version available — Refresh")
- [ ] T072 Test offline-first in `src/pages/Practice.tsx`, `src/pages/Words.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`, `src/pages/Learning.tsx` — all work with `navigator.onLine===false` after first load (LS/IDB still readable)
- [ ] T073 Add graceful offline handling in `src/services/dictionaryService.ts` `lookup`: if `!navigator.onLine` or fetch fails → return `null` with banner "Dictionary unavailable offline" not throw
- [ ] T074 Verify SPA routing safety: `vercel.json`/`_redirects` + SW `navigateFallback` ensure `/words` direct + refresh never 404; `vite preview` validates

**Checkpoint**: `typecheck` + `build` pass; SW does not trap old builds; offline functional

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Final sweeps, performance, privacy, and full journey verification

- [ ] T075 [P] Perform fake-data sweep per prompt §25: grep `109|12%|dummy|mock|demo|fake|placeholder|sample|testUser|John|Alex` — remove production mocks, keep fixtures isolated
- [ ] T076 [P] Audit `src/pages/Settings.tsx` for "Coming soon" / non-functional toggles — remove any control without implementation per prompt §14 (§21 overload check)
- [ ] T077 Verify no scattered `localStorage.setItem` outside `src/storage/` + `src/services/storage.ts` via grep; refactor any found to facade
- [ ] T078 Ensure performance boundaries in `src/store/useAppStore.ts`: writes only on answer submitted/word completed/session completed/setting changed/word added/profile changed — never per keystroke; envelope attempts cap 5000 enforced
- [ ] T079 Verify privacy: no `fetch` sending `userProfile`/`attempts`/`userWords` to server; no analytics SDK; only user-initiated dictionary `lookup` leaks word text (documented)
- [ ] T080 Test error recovery: corrupt `localStorage["ielts-spelling-envelope-v1"]` to `{invalid` → reload shows banner not crash; IDB blocked (private) fallback to LS in `src/services/storage.ts`
- [ ] T081 [P] Test multi-tab consistency: open two tabs → tab A `updateSettings({dailyGoal:50})` → tab B receives `storage`/`BroadcastChannel` and re-renders within 2s; document in `research.md`
- [ ] T082 Test 1200+ words scale: `src/data/words.ts` → add 400 synthetic user words → verify search filter <100ms, no LS quota crash (prune oldest attempts, show toast)
- [ ] T083 Run production verification: `npm run typecheck && npm run build && npm run preview` — confirm `quickstart.md` first-load flow + Rahim/Karim isolation + app update safety (§32) on preview server
- [ ] T084 Execute complete user journey from `prompt.md` §33 (21 steps Rahim + 7 steps Karim) and `quickstart.md` validation — log pass/fail per step, fix any deviation before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (US1-US13)
- **User Stories (Phase 3–15)**: All depend on Foundational completion
  - P1 stories (US1-US3, US9-US13) prioritized for MVP but can run in parallel after foundation
  - P2 stories (US4-US6) depend on foundation, integrate with P1 but independently testable
  - P3 stories (US7-US8) depend on foundation
- **Polish (Phase 16)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 Focused Practice (P1)**: After Foundational — no deps
- **US2 Listen & Type (P1)**: After Foundational — builds on US1 practice loop but testable alone (mode listen)
- **US3 Adaptive (P1)**: After Foundational — uses US1 progress model, independent via simulation
- **US4 Mistake Intelligence (P2)**: After Foundational + US1 — aggregates US1 attempts
- **US5 Dashboard (P2)**: After Foundational + US1/US3 — derives from attempts/wordProgress, but zero-state testable without US3
- **US6 Word Library (P2)**: After Foundational — uses `getAllWords()` + progress, independent
- **US7 Gamification (P3)**: After Foundational + US1 — streak/daily from US1, independent ring test
- **US8 Settings (P3)**: After Foundational — wraps persistence, independent export/import
- **US9 Onboarding (P1)**: After Foundational — gate for all routes, blocks UI until profile
- **US10 Dashboard Personalization (P1)**: After Foundational + US9 + US1 — verifies zero vs real stats
- **US11 Single Source (P1)**: After Foundational + US1/US3 — audit pass
- **US12 Data Management (P1)**: After Foundational + US9 + US8 — uses storage facades
- **US13 Hosting/Cache (P1)**: After Setup + Foundational — SW + manifest + offline

### Within Each User Story

- Models/types before services
- Services before UI
- Core implementation before integration
- Gate/confirm dialogs before destructive actions
- Story complete before moving to next priority in sequential mode

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel (manifest, index.html, vercel.json)
- All Phase 2 `[P]` storage facades can run in parallel (user/progress/settings/word)
- After Foundational, US1-US3 can start in parallel by different devs (practice, listen, adaptive)
- US5 dashboard + US6 library can run in parallel (different pages)
- US9 onboarding + US13 PWA can run in parallel (different files)
- All Phase 16 polish tasks marked [P] can run in parallel (sweep, audit, privacy)

---

## Parallel Example: User Story 1 (Focused Practice)

```bash
# Two devs after Foundational:
# Dev A: Practice loop
Task: "Audit Practice.tsx ensures recordAttempt only on handleCheck" (T018)
Task: "Verify keyboard shortcuts in Practice.tsx" (T021)

# Dev B: Dashboard (can start concurrently)
Task: "Refactor Dashboard.tsx hero personalization" (T033)
Task: "Verify Word Library filters" (T038)
```

## Parallel Example: Foundational

```bash
# Launch together:
Task: "Create storageKeys.ts" (T008)
Task: "Create userStorage.ts" (T009)
Task: "Create progressStorage.ts" (T010)
Task: "Create settingsStorage.ts and wordStorage.ts" (T011)
```

---

## Implementation Strategy

### MVP First (Prompt §35 Minimal Complete)

1. Complete Phase 1 Setup + Phase 2 Foundational (storage, profile, sync, error recovery)
2. Complete US9 Onboarding (Phase 11) + US1 Focused Practice (Phase 3)
3. Complete US10 Dashboard Personalization (Phase 12) + US12 Data Management dialogs
4. **STOP and VALIDATE**: Run `quickstart.md` Rahim journey steps 1–12 in one browser — verify onboarding→personalized zero-state→practice→stats→custom word→refresh→name edit→clear progress/all
5. Deploy/demo if ready (public link works with no login)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1/US2/US3 → Core practice + adaptive (spec MVP!)
3. Add US9/US10/US11 → Public multi-user local-first (prompt MVP!)
4. Add US5/US6/US4 → Dashboard + library + mistakes
5. Add US13 → PWA/hosting/offline
6. Add US7/US8/US12 → Gamification + settings real + Data & Privacy
7. Polish → fake-data sweep, performance, full 33-step journey + Karim isolation, `typecheck && build` pass

### Parallel Team Strategy

With 3 devs after Foundational:
- Dev A: US1/US2/US3 + US11 audit (practice & adaptive)
- Dev B: US9/US10/US12 + US5 (onboarding, dashboard, data management)
- Dev C: US6/US4 + US13 (library, mistakes, PWA/hosting)

Stories complete and integrate independently via single `useAppStore` envelope.

---

## Notes

- [P] tasks = different files, no dependencies — run in parallel
- [Story] label maps task to specific user story for traceability
- Each US should be independently completable and testable per its Independent Test
- Verify persistence after every user-visible change (refresh/close)
- Commit after each task or logical group; stop at any checkpoint to validate
- Avoid: vague tasks, same-file conflicts, cross-story deps that break independence
- Privacy: never transmit `userProfile`/progress to server; document any future analytics opt-in
- Performance: never persist per keystroke; cap attempts 5000; virtualize lists at 400
