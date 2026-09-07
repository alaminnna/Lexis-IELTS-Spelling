# Quickstart — IELTS Spelling Trainer (Production Local-First)

**Branch**: `001-ielts-spelling` | **Stack**: Vite + React 19 + TS 6 + Tailwind 3.4 + Zustand + idb 8 + vite-plugin-pwa | **Date**: 2026-09-07

## Prerequisites

- Node 20+ (`node -v`), npm 10+
- Modern browser (Chrome/Edge/Firefox/Safari). No backend required.

## Setup

```powershell
npm install
npm run gen:words    # parses 1200-word MD → src/data/words.ts (~884 words, 36 categories)
npm run dev          # http://localhost:5173  (Vite handles SPA fallback)
```

## Build & Preview (production check — §32)

```powershell
npm run typecheck   # tsc -b --noEmit — must PASS
npm run build       # tsc -b && vite build — must PASS, emits hashed assets + SW + manifest
npm run preview     # http://localhost:4173 — test direct routes + SW update
# Manual SPA check:
#   open /           → OK
#   open /words      → OK (no 404, SW + server fallback to index.html)
#   open /learning   → OK
#   open /practice   → OK
#   refresh on each  → state preserved, no blank
```

## First-Load Flow (§26)

```
Open site → check localStorage/IDB (key: ielts-spelling-envelope-v1 / ielts-spelling-db)
  → no profile.onboardingCompleted → show Onboarding (Welcome + "What's your name?" + Continue)
  → yes → Dashboard "How you're doing, <name>"
```

## Validation — Complete User Journey (prompt §33 — MUST PASS)

### User 1 (Chrome / primary profile)

1. **Clear for clean test**: DevTools → Application → Clear Storage (or Settings → Data & Privacy → Clear All Data). Reload.
2. **Onboarding appears**: Enter `Rahim` → Continue. Verify saved (DevTools → Application → Local Storage → `ielts-spelling-envelope-v1` contains `userProfile: {name:"Rahim", onboardingCompleted:true}` and IDB `ielts-spelling-db` has same).
3. **Dashboard zero-state**: Should show `How you're doing, Rahim` + `You haven't practiced yet. Start your first practice session...` — NOT `109` or `12%`. Cards: Today 0 words, Total 0/884, Streak 0, Mastered 0.
4. **Practice several words**: Practice → (default `listen` or choose) → type → Enter (5–6 words mixed correct/wrong). Verify ring/stat update live, no reload, attempts visible in DevTools.
5. **Verify statistics updated**: Dashboard → `You've practiced N times with X%`, Today N, `weak` list shows lowest mastery words.
6. **Words → Add custom word**: `/words` → "+ Add New Word" → word `resilient` (Bangla, category) → Add. Verify in list under "MY WORD", searchable.
7. **Custom word persists**: Filter `My` → `resilient` visible. Go Learning → search `resilient` → practice this word → adaptive recognizes.
8. **Learning adaptive state**: `/learning` → continue, then `/practice` uses weak words preference (if `resilient` was wrong repeatedly it surfaces sooner — check via console `debugWhy` helpers).
9. **Refresh preserves all**: Press F5 → name still Rahim, stats still N, custom word still there, adaptive state (WordProgress mastery for `resilient`) same.
10. **Change name in Settings**: `/settings` → Profile → edit to `Karim-like` (use `Al A Min`) → Save. Immediately go Dashboard → greeting updates to `How you're doing, Al A Min`. Refresh → still `Al A Min`.
11. **Clear Practice Progress**: Settings → Data & Privacy → Clear Practice Progress → Confirm Dialog (`Clear practice progress? … [Cancel] [Clear Progress]`) → Confirm. Verify Dashboard stats zero (`You haven't practiced yet.` or 0), streak 0, but **custom word `resilient` still exists**, Settings theme/sound remain, name still `Al A Min`.
12. **Clear All Data**: Same section → Clear All App Data / Reset Everything → Dialog `This cannot be undone. [Cancel] [Clear All Data]` → Confirm. Verify: onboarding reappears, blank name prompt; Dashboard stats gone, custom word `resilient` gone, no old name in memory; no manual refresh needed; LS/IDB cleared or reset.

### User 2 isolation (private window / other browser)

Simulates `Chrome → Rahim's data / Edge → Karim's data` (§10):

1. Open private window (or second browser): `http://localhost:5173` → **onboarding again** → Enter `Karim`.
2. Verify **Rahim/Al A Min data NOT visible**: Dashboard zero-state, no `resilient`, stats independent.
3. Practice 3 words in Karim window → Dashboard shows `Karim` with own stats (N=3).
4. Add custom word `ubiquitous` as Karim → verify in Karim only.
5. Return to primary window (Rahim) → still shows either Al A Min or Rahim + `resilient` if before Clear All; **not** Karim's `ubiquitous`. Isolation PASS if no mixing.

## Settings Real Functionality Only (§14, §21)

For every control visible on `/settings`:
- Theme light/dark/system → changes `documentElement.classList`, persists after refresh/close.
- Sound enabled / Volume / Auto-play / Slow rate → immediately affects audio in `/practice` Learn/Learning; persists.
- Daily goal / Default mode / Session length / Adaptive toggle → affects Practice session size/mode; persists.
- Profile name → immediate dashboard effect + persists.
- Export → downloads `lexis-backup-YYYY-MM-DD.json` containing envelope (`userProfile`, `settings`, `customWords`, `progress`, `streak`, `adaptive`); Import → restores identical after reset; Reset → via confirmation, no stale memory.
If any control appears fake or resets on refresh → DELETE it (prompt §14).

## Error Recovery (§27)

- **Corrupted JSON**: DevTools → Application → Local Storage → edit `ielts-spelling-envelope-v1` to `{invalid` → reload → app shows banner `We couldn't access your local data...` and falls back to clean state (no crash).
- **Storage blocked**: Block third-party storage in private mode → app shows same graceful banner, remains usable in memory.

## Offline & Caching (§11–13)

- After first load, set DevTools → Network → Offline → reload → Words available, last known dashboard, practice usable (audio = OS TTS still works), settings usable; dictionary fetch on `/words` detail shows `Offline — dictionary unavailable` instead of crash.
- DevTools → Application → Cache Storage → `workbox-precache-*` exists; JS/CSS hashed, navigation `NetworkFirst`.

## Multi-Tab (§29)

- Open two tabs → tab A: change Settings dailyGoal → tab B: dashboard `Goal` eventually updates (storage event / BroadcastChannel). At minimum, manual refresh on B shows new goal (no stale).

## Performance (§28)

- With 1200+ words, type in `/words` search → filter <100ms.
- Practice input → no LS write per keystroke (check DevTools → Application → LS `modified` timestamp only changes on Enter/check).
- Envelope capped at 5000 attempts; bulk writes only on submit/complete/setting/word.

## Contracts to Reference

- `specs/001-ielts-spelling/contracts/storage-envelope.json` + `user-profile.json`
- `specs/001-ielts-spelling/contracts/storage-keys.md`
- `specs/001-ielts-spelling/contracts/word.schema.json`
- `specs/001-ielts-spelling/contracts/practice-modes.md`
- `specs/001-ielts-spelling/data-model.md` (UserProfile, StorageEnvelope)
- `specs/001-ielts-spelling/research.md` (SW, isolation, versioning)

## Troubleshooting

- `speechSynthesis` empty voices → wait ~500ms, proxies retry on click; if unavailable, UI shows Play fallback.
- IDB blocked (private) → LS fallback (`ls: ielts-spelling-envelope-v1`).
- Port in use → `npm run dev -- --port 5174`.
- SW stuck on old version → DevTools → Application → Service Workers → Update, or app's update toast → Refresh.
- Hash mismatch 404 on direct `/words` after deploy → ensure host has SPA fallback (`_redirects` `/* /index.html 200` or `vercel.json` rewrites).
