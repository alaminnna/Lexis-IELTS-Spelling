# Implementation Plan: Premium IELTS Spelling Training Web App — Production-Ready Public Multi-User Local-First Upgrade

**Branch**: `001-ielts-spelling` | **Date**: 2026-09-07 | **Spec**: `specs/001-ielts-spelling/spec.md` + `prompt.md` (public multi-user local-first upgrade)

**Input**: Original spec (`spec.md` — 8 modes, mastery, mistake intelligence, dashboard, word library, streak/gamification, persistence) + Prompt upgrade (35 acceptance sections: onboarding, per-browser isolation, dynamic dashboard, real progress, single source of truth, storage abstraction, versioning, caching/Service-Worker, offline-first, settings real functionality, profile, data management, error recovery, performance, multi-tab consistency, privacy, app update safety).

## Summary

Upgrade the existing Vite + React 19 + Zustand + IndexedDB IELTS Spelling Trainer from a single-user local app into a **production-ready public, multi-user, local-first web application** that anyone can open immediately with no login. The upgrade preserves all existing architecture (Word system, Practice, Learning, adaptive engine `services/adaptiveReview.ts`, audio `services/audio.ts`, scoring, mistake analysis, wordRepository) and adds: (1) per-browser isolated user profile via `localStorage` + IndexedDB mirror with centralized storage abstraction and `STORAGE_VERSION` migration, (2) first-time onboarding (name-only) gating with personal dashboard/zero-state personalization, (3) single source of truth progress repository, real statistics derivation, adaptive persistence, (4) Service-Worker/PWA caching for static assets with safe update strategy, (5) fully functional Settings (profile edit, clear practice progress, clear all data with confirmation, persistence across refresh), and (6) performance, error-recovery, multi-tab sync, and privacy guarantees. Hosting target is a static deploy (Vercel/Netlify) with SPA fallback.

## Technical Context

**Language/Version**: TypeScript 6.0 (~6.0.2), Node 20, ES2022. Strict TS, `tsc -b && vite build` gates production.

**Primary Dependencies**: React 19.2 + React Router 7.3, Vite 8.2, Tailwind CSS 3.4, Zustand 5.0 (single `useAppStore`), `idb` 8.0 (IndexedDB wrapper), Web Speech API (`speechSynthesis`) + Web Audio chimes, Recharts 2.13, Framer Motion 11.11 + GSAP 3.15 + Lenis 1.3, `date-fns` 4, `clsx` + `tailwind-merge`. New: `vite-plugin-pwa` (Workbox `generateSW`) for Service Worker — chosen over manual SW for framework-native integration and cache-busting via build hash.

**Storage**: IndexedDB (`ielts-spelling-db`, store `app`, key `envelope`) as primary + `localStorage` JSON mirror (`ielts-spelling-envelope-v1`) as fast-boot fallback and IDB-blocked fallback. Cache API + Service Worker for static assets only (JS/CSS/fonts/icons/images/app-shell/word dataset/audio where cached). User learning data stays in IDB/localStorage, NEVER only in Cache API. Centralized abstraction: `src/storage/storageKeys.ts`, `src/storage/userStorage.ts`, `src/storage/progressStorage.ts`, `src/storage/settingsStorage.ts`, `src/storage/wordStorage.ts` wrapping `services/storage.ts` envelope (`StorageEnvelope` versioned). Writes only at boundaries: answer submitted, word completed, session completed, setting changed, word added, profile changed — never per keystroke.

**Testing**: `tsc -b --noEmit` + `vite build` must pass. Manual E2E validation of the 33-step complete user journey (prompt §33) in two browsers (Rahim/Karim isolation). Unit spots for `mistakeAnalysis` (95% target), `adaptiveReview` weighted sampling, `storage` migration; future Vitest + Playwright optional per existing research.

**Target Platform**: Evergreen browsers (Chrome/Edge/Firefox/Safari desktop + iOS/Android). Offline-capable static SPA; responsive 375–1920px (sidebar 260px desktop, drawer mobile). No backend; client-only.

**Project Type**: Web application (single SPA, static deploy) — no backend folder.

**Performance Goals**: FCP <1.2s, TTI <1.8s, practice input latency <50ms, word library filter <100ms for 884 entries, Lighthouse Performance ≥90, writes debounced at boundaries, IDB + LS fallback <5ms read, SW precache <800KB shell, 1200+ words + hundreds of attempts without jank.

**Constraints**: No required login/backend; personal data never leaves browser; external dictionary fetch degrades gracefully offline; `speechSynthesis` may be blocked — show Play button; localStorage quota ~5MB, envelope capped at 5000 attempts; SW must not trap old builds (cache-first for hashed static, network-first for navigation).

**Scale/Scope**: ~884 system words + unlimited user words (`userWords`), hundreds to thousands of attempts/sessions, 36 categories, daily goals up to 100/200, 7 pages + onboarding, 8 practice modes, adaptive state per word (attempts/correct/wrong/accuracy/mastery/state/streaks/lastPracticed/avgResponse/mistakeHistogram/nextReviewAt/historicalMastery).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution template empty (no library-first or gate mandates) → Single SPA appropriate — PASS.
- Simplicity & test discipline respected: isolate storage/profile/onboarding, adaptive, mistake, scoring, audio, statistics modules with unit seams; Settings controls only expose implemented behavior — PASS.
- No CLI/observability gates triggered; local-first observability via export JSON + console; privacy (no personal data exfiltration) satisfied — PASS.
- No violations requiring justification. Complexity added (SW/PWA, onboarding gate, storage abstraction) is required by prompt and justified in Complexity Tracking — PASS (post-design re-check also PASS).

## Project Structure

### Documentation (this feature)

```text
specs/001-ielts-spelling/
├── plan.md                   # This file
├── research.md               # Phase 0 output — decisions for onboarding, storage, SW, versioning, multi-tab
├── data-model.md             # Phase 1 output — UserProfile + updated StorageEnvelope
├── quickstart.md             # Phase 1 output — validation journey (Rahim/Karim)
├── contracts/
│   ├── storage-envelope.json # JSON schema v1 extended with userProfile, envelope envelope
│   ├── storage-keys.md       # NEW: storage abstraction contract (keys + API)
│   ├── user-profile.json     # NEW: UserProfile schema
│   ├── word.schema.json      # Word schema
│   └── practice-modes.md     # 8 modes + adaptive + shortcuts
└── tasks.md                  # Phase 2 (not by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── words.ts                 # generated 884 words + categories
├── types/
│   ├── word.ts                  # Word, Difficulty, WordSource
│   └── progress.ts              # WordProgress, Attempt, Session, Streak, Settings, Gamification, StorageEnvelope, LearningSession, UserProfile (NEW)
├── storage/                     # NEW abstraction (adapt to existing services/storage.ts — do not scatter localStorage)
│   ├── storageKeys.ts           # STORAGE_VERSION, DB_NAME, STORE, LS_KEY, CACHE_NAME
│   ├── userStorage.ts           # getUserProfile / saveUserProfile / updateUserProfile / clearUserProfile
│   ├── progressStorage.ts       # getProgress / saveProgress / clearProgress (practice history + streak + adaptive)
│   ├── settingsStorage.ts       # getSettings / updateSettings (theme, audio, goal)
│   └── wordStorage.ts           # getCustomWords / saveCustomWord / deleteCustomWord
├── services/
│   ├── storage.ts               # IDB + LS envelope (existing) — refactored to delegate to storage/*, versioned migration + corrupted JSON recovery
│   ├── adaptiveReview.ts        # existing — persists via wordProgress (already durable)
│   ├── mistakeAnalysis.ts       # existing
│   ├── scoring.ts               # existing (mastery tier 0-39/40-59/60-79/80-94/95-100)
│   ├── statistics.ts            # aggregations for charts (real derived data)
│   ├── audio.ts                 # SpeechSynthesis + chimes
│   └── wordRepository.ts        # getAllWords + userWords (already per-browser via envelope)
├── store/
│   └── useAppStore.ts           # Zustand root — extended with profile/onboarding, clearProgress, clearAllData, storage-event/BroadcastChannel sync
├── hooks/
│   ├── useProfile.ts            # NEW: onboardingCompleted, name, updateName
│   ├── useStreak.ts / useProgress.ts / useAudio / usePractice / useSettings (existing)
│   └── useStorageSync.ts        # NEW: storage/BroadcastChannel listener for multi-tab
├── components/
│   ├── onboarding/
│   │   └── Onboarding.tsx       # NEW: Welcome → "What's your name?" → Continue (validate trim/non-empty, save, mark completed, navigate Dashboard)
│   ├── layout/
│   │   └── AppShell.tsx         # gated: if !onboardingCompleted render <Onboarding/> else Outlet; handles init + theme + SW update toast
│   ├── ui/                      # Button, Card, Badge, Input, ProgressRing, Dialog (used for destructive confirmations)
│   ├── dashboard/               # hero personalized with name, zero-state, stats derived from real attempts
│   ├── practice/                # PracticeCard (counts only on submit)
│   └── word/                    # WordList + Detail
├── pages/
│   ├── Dashboard.tsx            # personalized "How you're doing, <name>" + zero vs real stats (never 109/12% unless real)
│   ├── Practice.tsx             # uses shared progress; session persists only on submit
│   ├── Learning.tsx             # reads adaptive state
│   ├── Words.tsx                # custom word per-browser, deleted on Clear All Data
│   ├── Mistakes.tsx / Statistics.tsx
│   └── Settings.tsx             # Appearance + Audio + Practice + Profile (editable name → Dashboard immediate) + Data & Privacy (Clear Practice Progress, Clear All Data) + About
├── styles/index.css
└── utils/cn.ts, format.ts

public/
├── favicon.svg
├── manifest.webmanifest         # NEW: PWA manifest (name, icons, display standalone, theme_color)
└── (precached via SW)

scripts/parse-words.mjs

vite.config.ts                  # + VitePWA({ registerType: 'prompt', includeAssets, workbox: { globPatterns, runtimeCaching }, navigateFallback })

index.html                      # + <link rel="manifest">, theme-color, apple-touch-icon
```

**Structure Decision**: Single Vite SPA retained (Option 1). New `src/storage/` abstraction coexists with existing `services/storage.ts` (which becomes the envelope engine delegated to). Onboarding is a gate component, not a separate route, to guarantee first-load flow without extra routing complexity. SW via `vite-plugin-pwa` `generateSW` keeps build deterministic and respects prompt §11–12 (cache-first hashed static, network-first navigation, skipWaiting/clientsClaim with prompt).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Storage abstraction folder (`src/storage/` over single file) | Prompt §8 forbids scattered `localStorage.setItem`; requires centralized repository with per-domain modules and keys; enables versioned migration and type-safe API + tests | Single `services/storage.ts` already central but mixes concerns (user+progress+settings+words) and exposes raw LS keys to components; rejected to satisfy prompt's clean module boundary and future IndexedDB split |
| Service Worker/PWA (`vite-plugin-pwa`) | Prompt §11–13 requires production caching + offline-first; must survive deploy updates without trapping old builds | No SW = no offline, no cache; manual SW hand-written is error-prone for hash-cache busting and SPA navigation fallback |
| BroadcastChannel + `storage` event sync | Prompt §29 multi-tab consistency; Zustand in-memory would show stale dashboard | Polling or no-sync would leave tabs desynced; storage event alone misses same-document updates; combined is minimal and native |
| Harmless in-memory `recentGlobal` in adaptiveReview | Keeps session-local recency without persisting transient pool noise | Persisting recency would bloat envelope and penalize fresh sessions |
