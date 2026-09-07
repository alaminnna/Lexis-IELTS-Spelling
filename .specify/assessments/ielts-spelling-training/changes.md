# Implementation Updates — 2026-09-07

Applied after research.md + spec.md + flow.md, before `/speckit.assess.define`.

## Patched Files

### `src/pages/Practice.tsx`
- **Mode routing fixed**: now reads `?mode=` via `useSearchParams`, validates against `ALLOWED_MODES`, falls back to `envelope.settings.defaultMode ?? "listen"` — fixes dead links from Dashboard (`/practice?mode=listen`), Words (`/practice?mode=weak`), Mistakes (`/practice?mode=mistakes`). `selectNextWords`, `startSession`, `recordAttempt` now use `activeMode` instead of hardcoded `"listen"`. Added `useEffect` to reset idx/typed/state/results when `activeMode` changes. Shows mode badge `capitalize(activeMode)` next to Word count and in Session complete header.
- **Keyboard shortcuts completed per prompt**: global `onKey` now handles:
  - `Ctrl/Cmd+Space` → Play normal even while typing (prevents space insert)
  - `Space` (not typing) → Play normal
  - `R` (not typing) → Play slow
  - `N` (not typing) → Next (or Check if typing with content)
  - `Escape` → `navigate("/")` Exit practice
  - `Enter` (not input focused) → Check/Next
  - Imported `useNavigate`, `useSearchParams`, `PracticeMode` type.
- **Bug fixed**: moved `idx/typed/state/...` declarations before the mode-reset effect to avoid TDZ ReferenceError.
- **Hint updated**: footer now reads `Space play • R slow • N next • Esc exit • Ctrl+Space to play • Press Enter to ...`
- Verified: `npm run typecheck` 0 errors, `npm run build` succeeds (563kB gzip).

### `src/pages/Words.tsx`
- **Filter bug fixed**: `recentlyWrong` previously `!!p && !p.correct && p.wrong>0 ...` excluded mixed correct/wrong words. Changed to `!!p && p.wrong>0 ...` so any word with ≥1 wrong in last 7d appears — matches spec intent for reviewing slips.

### `src/pages/Dashboard.tsx`
- **Timezone bug fixed**: `today` previously UTC `toISOString().slice(0,10)` mismatched `store.todayISO()` local date (causing daily ring to show stale at UTC midnight). Now computes local `YYYY-MM-DD` and filters `todayAttempts` by converting each `attempt.timestampISO` to local date via `new Date().getFullYear()/getMonth/getDate`.

### `src/components/layout/AppShell.tsx`
- Same timezone fix for `Sidebar` dailyProgress lookup.

### `src/pages/Settings.tsx`
- **Default mode enabled**: previously disabled select locked to `"listen"`. Now bound to `s.defaultMode` with `onChange => updateSettings({defaultMode})` and 8 options (listen/smart/normal/random/mistakes/weak/quick10/challenge50). Persists to envelope and drives Practice fallback.

## Remaining Gaps (documented in research.md & flow.md, not patched this pass)

- `Words` detail pane lacks per-word attempt timeline history (only histogram).
- `recentlyWrong` accuracy threshold could be tightened to <100% explicitly; currently shows any wrong.
- Heatmap in Statistics uses session `startedAt` UTC slice vs local dailyProgress — off-by-one for westerly timezones.
- `three` / `@react-three/fiber` bundle 2MB (563kB gzip) — ambient shaders `DashboardAmbient`/`PracticeShader` justify it, but code-split via `React.lazy` + dynamic import would cut initial chunk. Chunk warning remains.
- Gamification missing `20 Correct in a Row` and `100% Accuracy` achievements vs prompt list.
- No axe/Pa11y a11y audit, no Plausible/PostHog analytics, no FSRS scheduler.
- Corpus noisy entries (`burring fossil`, `China Greece`, `coupon counterfeit money`) retained; awaiting clarification on canonical 884 vs 1200.

## Verification

- `npm run typecheck` → 0 errors
- `npm run build` → ✓ 1009 modules, 2,032kB JS (563kB gzip), 35.7kB CSS, built in 5.94s
- Manual route check: `/practice?mode=weak` now selects weak pool; `/practice` defaults to `settings.defaultMode`.

Next recommended step: `/speckit.assess.define slug=ielts-spelling-training` to formalise defined spec, then `/speckit.assess.decide`.
