# Research — IELTS Spelling Trainer: Production-Ready Public Multi-User Local-First

**Feature**: `001-ielts-spelling` upgrade | **Date**: 2026-09-07 | **Spec Source**: `spec.md` + `prompt.md` (35 sections) + codebase audit (`src/**/*`)

## Audit Summary (pre-research inspection)

- **Word system** (`src/data/words.ts` ~884 system words via `scripts/parse-words.mjs`, `src/services/wordRepository.ts` with `getAllWords()` merging `SYSTEM_WORDS` + `userWords` filtered by `hiddenWordIds`, sanitized via `sanitizeWord`): sound, already per-browser via envelope, supports custom `source:"user"` words; personal notes via overlay (`overlay-<id>`). Must ensure custom words use `userWords` and are deleted on Clear All Data.
- **Practice** (`src/pages/Practice.tsx`, `src/hooks/usePractice.ts`): real `recordAttempt` only on submit (never on display), input latency <50ms, keyboard shortcuts covered, session `completeSession` computes xp. Must keep semantics.
- **Learning** (`src/pages/Learning.tsx`): resume/validation for `activeLearningSession`, meta-learning `services/metaLearning.ts` persisted in envelope. Already shared progress.
- **Adaptive engine** (`src/services/adaptiveReview.ts`): priority scoring (wrong×, accuracy, consecutiveWrong, recency, gap, overdue, state, recent penalty), `recentGlobal` in-memory, `deriveWordState`, `calculateMastery`, `calculateNextReviewAt`. State persisted via `WordProgress` fields; must guarantee persistence across reloads (already via envelope).
- **Audio** (`src/services/audio.ts`, `src/hooks/useAudio.ts`): Web Speech API with voice picking, `AudioContext` chimes, respects `settings.soundEnabled/volume/autoPlay/slowRate`. Must remain functional and add offline graceful state if speechSynthesis blocked/ offline.
- **Progress/storage** (`src/services/storage.ts`, `src/store/useAppStore.ts`, `src/types/progress.ts`): `StorageEnvelope version:1`, fields `wordProgress/attempts/sessions/streak/gamification/settings/dailyProgress/userWords/hiddenWordIds/metaLearning/activeLearningSession`. IDB primary + LS mirror (`ielts-spelling-envelope-v1`), `migrateEnvelope` sanitization, `safeParse` corrupted guard but minimal error UI. No `UserProfile` yet, no `storageKeys.ts` central list, no `BroadcastChannel` sync, no SW.
- **Dashboard** (`src/pages/Dashboard.tsx`): already real-derived (`attempts`, `correct/acc`, `mastered/weak`, `dailyProgress`, `xp`); zero-state text "Start your first session". Not yet personalized (`Good to see you back.` generic), needs name.
- **Settings** (`src/pages/Settings.tsx`): handles Appearance/Audio/Practice/Data (Export/Import/Reset) but no Profile edit, no distinction Clear Practice Progress vs Clear All Data, uses `confirm()` not Dialog, shows mock-like unimplemented toggles check required (currently all implemented — verify and prune if fake).
- **Refs**: `src/components/layout/AppShell.tsx` init gate (`useAppStore.init` loads envelope, applies theme) but no onboarding gate; `vite.config.ts` has no PWA plugin; `index.html` no manifest.

---

## 1. Per-Browser Isolation + Anonymous Profile (Prompt §1, §10)

- **Decision**: Keep envelope as single source per origin (browser) stored in IDB + LS mirror. No server, no shared global state, no hardcoded identity. Introduce `UserProfile` inside envelope so isolation is automatic (Chrome profile A → its LS/IDB, Edge → different).
- **Rationale**: Requirement is local-first anonymous; per-browser storage isolation is native (origin storage partition). No extra namespacing needed beyond what IDB/LS already provide. Adding a `profile` object (name, onboarding flag, createdAt) makes intent explicit without server.
- **Alternatives**: Keying by `userId` prefix in LS — rejected (still one envelope; adds complexity for single-user-per-browser case). Backend auth — forbidden by §1.
- **Consequences**: `findWordById` etc automatically per-browser because envelope is per-browser.

## 2. Storage Abstraction + Keys (Prompt §8)

- **Decision**: Retain `services/storage.ts` as low-level envelope engine but expose domain facades `src/storage/userStorage.ts`, `progressStorage.ts`, `settingsStorage.ts`, `wordStorage.ts` + `storageKeys.ts` (`STORAGE_VERSION=1`, `DB_NAME`, `STORE`, `LS_KEY`, `CACHE_NAME`). No component directly calls `localStorage.setItem`; all go via facades/store actions.
- **Rationale**: Prompt explicitly forbids scattered LS; abstraction enables migration, testing, and future IndexedDB object-store split without churn.
- **Alternatives**: Full `idb` object stores per domain (wordProgress store, settings store) — deferred; envelope JSON is <2MB even with 5000 attempts, well within IDB blob limit and simpler to export/import. Split later if envelope exceeds 5MB.
- **API sketch**: `getUserProfile()/saveUserProfile(p)/updateUserProfile(patch)/clearProgress()/clearAllData()` — implemented as `useAppStore` actions delegating to `saveEnvelope`.

## 3. Versioning & Migration + Corrupted Recovery (Prompt §9, §27)

- **Decision**: `const STORAGE_VERSION = 1` (matches envelope `version`). `migrateEnvelope(env:any)` adds missing keys (`userWords`, `hiddenWordIds`, `metaLearning`, `activeLearningSession`, `userProfile`/`profile` shim) and cleans polluted userWords via `simpleSanitize`. `safeParse` returns null on bad JSON or version mismatch. On `loadEnvelope`, try IDB → LS → `defaultEnvelope()`. If both IDB and LS corrupted, show banner `"We couldn't access your local data. Your browser may be blocking site storage."` and fall back to memory-only `defaultEnvelope` (no crash). Corrupted slice reset replaces only that slice.
- **Alternatives**: Throw and crash — violates §27. Write migration as separate version files (v1→v2) — prepped but v1-only now.

## 4. Onboarding Gate (Prompt §2–3, §26)

- **Decision**: `src/components/onboarding/Onboarding.tsx` full-viewport minimal form: title "Welcome to IELTS Spelling Trainer", input "Your name" (autoFocus, `required`, trim), button "Continue". On submit: validate non-empty after `trim()` → `saveUserProfile({name, onboardingCompleted:true})` → persist → navigate to `/` (dashboard). `AppShell` gates: `if (!ready) loader; else if (!envelope?.userProfile?.onboardingCompleted) return <Onboarding/>; else <Outlet/>`. Returning user bypasses onboarding. Direct navigation to `/words` etc redirects to onboarding if not completed.
- **Rationale**: Fastest possible UX, single field, no account. Gate as layout prevents route leakage.
- **Alternatives**: Route `/onboarding` — allows deep-link bypass; gate at shell is safer.

## 5. Dashboard Personalization + Zero-State (Prompt §4–5, §6)

- **Decision**: Hero reads `How you're doing, ${profile.name}` (name from `userStorage`). Subtext: if `attempts.length===0` show `"Hello ${name}. You haven't practiced yet. Start your first practice session to build your progress."` else `"You've practiced ${N} times with ${Math.round(acc)}%..."`. All numbers from `statistics.ts` derived data, never hardcoded `109/12%`. Cards (`todayWords`, `totalPracticed/totalWords`, `streak`, `mastered/weak`, `practiceTime`) use same derived values.
- **Alternatives**: Keep generic greeting — fails §4 criterion.

## 6. Real Progress Calculation + Single Source of Truth (Prompt §6–7, §23–24)

- **Decision**: Keep `useAppStore` as sole progress repository. Aggregations (`accuracyOverTime`, `masteryDistribution`, `mistakeBreakdown`, `categoryPerformance`, `heatmapData`) derive from `attempts` + `wordProgress` inside `statistics.ts`. Streak derived from `streak.lastPracticeDateISO` updated only in `updateStreak()` called from `recordAttempt`, not on dashboard open. `Words Learned`/`Mastered`/`Weak` via `deriveWordState` & `calculateMastery`. Unfinished sessions do not count (only `recordAttempt` on submit counts; display does not).
- **Rationale**: Single source eliminates divergence between Dashboard/Practice/Learning/Adaptive/Words/Settings.

## 7. Caching & Service Worker Strategy (Prompt §11–12)

- **Decision**: `vite-plugin-pwa` with `registerType: 'prompt'` (user gets update toast, not forced reload). `includeAssets: [favicon, icons, fonts]`, `workbox: { globPatterns: ['**/*.{js,css,html,woff2,svg,png}'], runtimeCaching: [{ urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, handler: 'CacheFirst', options: { cacheName: 'google-fonts', expiration: {maxAgeSeconds: 2592000}} }, { urlPattern: /\/api\/dictionary\/.*/, handler: 'NetworkFirst', options: { networkTimeoutSeconds: 4, cacheName: 'dictionary', expiration:{maxEntries:50}} }], navigateFallback: 'index.html' }`. Static hashed assets cache-first; navigation `NetworkFirst` with fallback to cached `index.html` for SPA refresh/direct `/words` loads ( §32). `skipWaiting` via prompt, not auto, so old builds not trapped (§12).
- **Alternatives**: Manual `sw.js` with `workbox-cli` — more boilerplate, hash busting error-prone. `registerType:'autoUpdate'` — risks breaking §12 update safety.
- **Offline**: Words, progress, practice (cached audio is OS TTS, always works), dashboard, settings remain usable offline; `dictionaryService.lookup` shows banner if `navigator.onLine===false` or fetch fails ( §13).

## 8. Multi-Tab Consistency (Prompt §29)

- **Decision**: In `useAppStore`, after `saveEnvelope`, broadcast via `BroadcastChannel('ielts-spelling')` if available else rely on `window.addEventListener('storage', (e)=>{ if(e.key===LS_KEY) reload envelope})`. On receiving message or storage event, `loadEnvelope().then(env=>set({envelope:env}))`. Minimal stale window; dashboard eventually consistent.
- **Alternatives**: Polling `setInterval` — wasteful. `SharedWorker` — overkill.

## 9. Error Recovery & Privacy (Prompt §27, §30)

- **Decision**: Wrap every `localStorage.getItem/setItem` and `idb` open/get/put in `try/catch`. Corrupted JSON → return null and trigger `defaultEnvelope()` slice. Show non-blocking toast/banner (existing `Settings` msg pattern). Never send name/history to server; no analytics SDK; only optional dictionary fetch (user-initiated word selection) leaks the looked-up word itself (documented).
- **Rationale**: Meets §30 privacy and §27 crash-proofing.

## 10. Settings — Real Functionality Only (Prompt §14, §21)

- **Decision**: Audit Settings controls against store. Keep only implemented toggles: theme, soundEnabled, volume, autoPlay, slowRate, dailyGoal, defaultMode, sessionLength, adaptiveEnabled. Remove any fake toggle (none currently fake — verify `sessionLength` actually consumed by `Practice` mode sizes — it is via `envelope.settings.sessionLength` default; keep). Add Profile (name edit → immediate Dashboard) + Data & Privacy (Clear Practice Progress, Clear All Data). If any toggle found fake, delete control rather than ship mock (§14).
- **Alternatives**: Keep placeholders for future — violates §14 and fails final acceptance.

## 11. Profile Editing (Prompt §15)

- **Decision**: Settings > Profile card: input `[ Al A Min ]` with Save (or auto-save on blur). Calls `updateUserProfile({name:trimmed})`, persists, dashboard reads `profile.name` live (Zustand selector). Persists across refresh/close.

## 12. Data Management (Prompt §16–19)

- **Decision**: Settings > Data & Privacy:
  - **Clear Practice Progress**: deletes `attempts`, `sessions`, `wordProgress` practice-related fields reset, `dailyProgress`, `streak` reset, `gamification` xp/level reset? Actually per prompt §16 delete practice history/attempts/accuracy/streak/word stats but NOT user name/custom words/settings. Confirmation Dialog `"Clear practice progress? This will permanently remove your practice history and progress. [Cancel] [Clear Progress]"`.
  - **Clear All Data**: deletes `profile/onboarding`, `wordProgress`, `attempts`, `sessions`, `streak`, `gamification`, `dailyProgress`, `userWords`, `hiddenWordIds`, `metaLearning`, `activeLearningSession`, settings reset to defaults. Confirmation Dialog with `"This cannot be undone."` plus double-confirm or red destructive button. After success: reset Zustand to `defaultEnvelope()` with `onboardingCompleted:false`, navigate to `<Onboarding/>` without manual refresh.
- **Rationale**: §18 safety, §19 verification checklist.

## 13. Custom Words Local Integration (Prompt §22)

- **Decision**: `wordRepository` already per-browser via envelope `userWords`. Ensure `addUserWord` uses `storage/wordStorage.ts` path and counts into adaptive `getAllWords()`. Included in `exportJson` and deleted by Clear All Data.

## 14. Performance (Prompt §28)

- **Decision**: Keep writes at boundaries already (store `recordAttempt` → `persist()` once per answer; `updateSettings` per change; `addUserWord` per add). Do not persist on input keystroke (verified Practice `handleInputChange` only triggers `ui.typeTick`, not persist). Cap `attempts` at 5000 and prune oldest on save. SW precache limited to hashed files.

## 15. App Update Safety (Prompt §32)

- **Decision**: Vite hashed filenames auto-cache-bust. `navigateFallback` `index.html` ensures `/words`, `/learning`, `/practice` direct loads work (SPA fallback via SW + via `vercel.json`/`_redirects` on host). SW `registerType: prompt` avoids stuck old version.

## 16. Fake Data Sweep (Prompt §25)

- **Decision**: Audit for `109`, `12%`, `dummy/mock/demo/fake/placeholder/testUser/John/Alex`. Only occurrence is Dashboard previous spec comment; no hardcoded stat now. Keep test fixtures isolated under `*.test.*` if added.

## Risks & Mitigations

- SpeechSynthesis voices async load → `onvoiceschanged` + 800ms fallback.
- Autoplay blocked → explicit Play button remains (Practice audio button).
- IDB blocked (private mode) → LS fallback works; SW still registers but IDB writes no-op is tolerable.
- `localStorage` quota exceeded → prune `attempts` oldest, show toast, never crash.
- Rapid re-renders → Zustand selectors + memoized `filtered` in Words.
