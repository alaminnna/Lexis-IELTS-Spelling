# Idea Research: Premium Personal IELTS Spelling Training Web App (Lexis)

- **Slug**: ielts-spelling-training
- **Created**: 2026-09-07
- **Evidence confidence (overall)**: medium

## Users & Demand

- Single-user primary persona is explicitly defined as the author practising IELTS Listening spelling daily, optimising for *personal mistakes* not generic users — [source: prompt.md:50-51] (confidence: high, cited)
- Demand signal is *stated want* from prompt author (self-directed learner needing spelling precision for Listening marks); no observed behaviour data (usage logs, support tickets) exists in repo — [source: .specify/assessments/ielts-spelling-training/intake.md | ASSUMPTION] (confidence: low, assumption flagged)
- Problem framing: IELTS Listening penalises spelling errors; 1200-word source list contains high-risk orthographic patterns (double letters, vowel-sensitive) e.g., accommodation/necessary/environment examples given — [source: prompt.md:318-364] (confidence: high, cited)
- No interviews, ticket counts, analytics, retention metrics found in codebase; `src/store/useAppStore.ts:17-148` shows local-first tracking but no product analytics wiring — [source: src/store/useAppStore.ts:17] (confidence: high, cited)
- Secondary user (any IELTS candidate) is aspirational for public launch; prompt says design should look launch-ready but store is single-user local-first with no auth — [source: prompt.md:86, prompt.md:715-718] (confidence: high, cited)
- Keyboard-first, audio-centric interaction is a *stated want* aligned with Listening exam simulation (Listen & Type hides written word) — [source: prompt.md:234-243, src/pages/Practice.tsx:288-336] (confidence: high, cited)
- Gap: no evidence of willingness to pay, competitor switching cost, or daily practice habit already formed; daily goal feature (10/20/30/50/100) assumes habit formation without validation — [source: ASSUMPTION] (confidence: low)

## Prior Art

- Internal precedent: repo already implements substantial prior art — full AppShell (sidebar + topbar + mobile drawer) with GSAP page transitions, Dashboard with ProgressRing/XP/weakest words, Practice with speechSynthesis + Web Audio chimes, Words library with mastery filters, Mistakes weakness engine, Statistics with Recharts, Settings with Import/Export — [source: src/App.tsx:10-22, src/components/layout/AppShell.tsx:39-234, src/pages/Practice.tsx:18-423] (confidence: high, cited)
- Internal precedent word pipeline: `scripts/parse-words.mjs:31-148` parses MD colon-delimited categories into 884 unique normalized words across 36 categories, dedupes case-insensitively, hash d858b220ce03; generated `src/data/words.ts:6` (AUTO-GENERATED 884 | 36) — preserves categories but reduces 1200 claim to 884 (deduplication + filtering). Why it matters: scope vs source-of-truth discrepancy (see Data & Constraints) — [source: scripts/parse-words.mjs:31, src/data/words.ts:1-6] (confidence: high, cited)
- Internal precedent adaptive algorithm: `src/services/adaptiveReview.ts:11-43` weight = masteryFactor( (100-mastery)/100 ^1.25 *40) * failFactor(1+wrongs*0.42) * recency * accBoost * streakPenalty with jitter; weightedSample without replacement for Smart/Normal+adaptive — prior attempt not A/B tested but shows sophisticated heuristic over pure random — [source: src/services/adaptiveReview.ts:11] (confidence: high, cited)
- Internal precedent mistake analysis: Levenshtein + Damerau transposition + vowel/consonant/repeated classification via `src/services/mistakeAnalysis.ts:46-123` — maps to 8 types (missing/extra/wrong/transposition/repeated/vowel/consonant/multiple) with `mistakeLabel`/`mistakeColor` — [source: src/services/mistakeAnalysis.ts:46] (confidence: high, cited)
- Internal precedent scoring: `src/services/scoring.ts:3-48` getTier thresholds 95/80/60/40 exactly matching prompt spec 0-39 Critical etc., updateMastery +6 correct (+2 if streak≥3, dampened at top) / -12 wrong, computeXp +10 correct + speed bonuses — [source: src/services/scoring.ts:3, src/services/scoring.ts:33, prompt.md:293-304] (confidence: high, cited)
- External prior art not fetched but relevant (flagged as assumption, would need live research): Duolingo (streak/XP gamification), Anki/Memrise (spaced repetition), IELTSonTrack/IDP practice tests (Listening spelling drills), keybr.com/Monkeytype (typing trainer UX) — similar gamification/local-progress patterns exist; differentiation is mistake-intelligence + single-owner local-first focus — [source: ASSUMPTION — no fetch performed for unallowlisted hosts] (confidence: low)
- Why prior internal builds matter: feature-complete spine exists; rebuilding from scratch would waste 34 source files, Zustand + IndexedDB persistence, audio/chime subsystems — [source: package.json:14-30, src/services/storage.ts:48-74] (confidence: high, cited)

## Market & Context

- Alternative users cope with today: paper word lists from PDF, generic flashcard apps (Anki), browser speechSynthesis playgrounds, manual Excel tracking — none combine audio-only drilling + per-character mistake diagnosis + adaptive resurfacing in one premium shell — [source: ASSUMPTION] (confidence: low)
- Trends favour local-first + offline-capable PWAs for focused learning (privacy, no auth, IndexedDB) vs cloud SRS — prompt explicitly prefers IndexedDB/localStorage with Import/Export JSON — [source: prompt.md:714-757] (confidence: high, cited)
- Cost of doing nothing: continued spelling errors in IELTS Listening = lost band score; for a motivated candidate practising daily, un-tracked weak words persist and streaks break — weakness engine + dashboard aim to close this feedback loop — [source: prompt.md:396-443] (confidence: medium, cited)
- Competitive moat is weak if built only for single user: local-first means no network effect; public launch would need differentiation (audio quality, curated IELTS corpus, adaptive accuracy) to stand out vs free YouTube/listening tests — [source: ASSUMPTION] (confidence: medium)
- Tech context: browser Web Speech API voice selection prefers en-GB Google voice (src/services/audio.ts:14) — availability varies by OS/browser (Safari vs Chrome), rate 0.62/0.9, pitch 1.0 — offline TTS quality is a platform constraint — [source: src/services/audio.ts:12] (confidence: high, cited)
- No pricing, GTM, or distribution plan in prompt; personal-use framing avoids App Store / payment compliance but limits TAM if launched — [source: ASSUMPTION] (confidence: medium)

## Data & Constraints

- Corpus size claim vs reality: MD title says "1200 most commonly repeated words in IELTS Listening Test" (prompt.md & 1200_most...md:1) — parsed result is 884 unique normalized tokens after case-insensitive dedup, length 2-60 filter, category preservation — [source: src/data/words.ts:4, scripts/parse-words.mjs:85-96, 1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md:1] (confidence: high, cited)
- Duplicates observed in source: "India" twice (line 29), "French" twice (line 32), "July August" missing comma (line 5) — parser handles July/August split heuristically — [source: 1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md:5, scripts/parse-words.mjs:55-57] (confidence: high, cited)
- Categories: 36 distinct (continents, countries, languages, etc.) — difficulty is heuristic `len ≤5 → easy, ≥10 → hard else medium` ignoring phonetics/frequency — [source: scripts/parse-words.mjs:24-29, src/data/words.ts:6] (confidence: high, cited)
- Storage budgets: IndexedDB (idb 8.0.0) + localStorage mirror; attempts capped at 5000 (useAppStore.ts:129, storage.ts:86), sessions unbounded, wordProgress per-word entry (<1KB) — for 884 words total < ~2MB local, well within IDB limits — [source: src/store/useAppStore.ts:129, src/services/storage.ts:64-74] (confidence: high, cited)
- Platform limits: SpeechSynthesis voice availability async (onvoiceschanged + 800ms fallback), AudioContext may be suspended until user gesture, cancellation needed before speak (audio.ts:27, audio.ts:66-88) — uneven iOS/Safari support for `rate` & `pitch` — [source: src/services/audio.ts:5] (confidence: high, cited)
- Performance: Vite 8 + React 19 + Tailwind 3.4, GSAP + Framer Motion for motion; heavy deps: three 0.185.1 + @react-three/fiber 9.7.0 + drei 10.7.8 included but unused by observed pages (bundle bloat risk) — [source: package.json:15-18] (confidence: high, cited)
- Responsive contract: 375/768/1024/1280/1440/1920px breakpoints per prompt (line 856-870), implemented via Tailwind grid + max-w-[1120px] containers; Practice `practice-fit` with justify-center centres audio/input — [source: prompt.md:856, src/pages/Practice.tsx:273] (confidence: high, cited)
- Accessibility contract per prompt (keyboard nav, focus states, semantic HTML, ARIA, contrast, reduced motion) — GSAP code respects `prefers-reduced-motion` for progress bar & card animate but Topbar/MobileNav still unconditionally animates some transitions — [source: prompt.md:872-885, src/pages/Practice.tsx:79-93] (confidence: medium, cited)
- Legal/compliance: local-first implies GDPR minimal (no server PII); Word list provenance "IELTS Listening" not licensed—likely fair-use word frequency list, but multi-word phrases like "bank statement money management" appear to be collocations not single words — [source: ASSUMPTION] (confidence: low)
- Metrics available internally: attempt accuracy, streak (current/longest + history array), XP/level via sqrt(xp/120)+1, mastery distribution per tier, mistake histogram per WordProgress, heatmap by session start date — [source: src/services/scoring.ts:72, src/types/progress.ts:12-26, src/services/statistics.ts:3-57] (confidence: high, cited)

## Evidence Against the Idea

- **Single-user scope caps upside**: prompt says "optimize for MY learning" (line 50) and "No authentication" (716) — TAM is 1 unless deliberately pivoted to multi-user; local-first + no backend makes launch marketing / retention loops harder — [source: prompt.md:50, prompt.md:715] (confidence: high, cited)
- **Corpus quality doubts**: 884 vs 1200 gap (26% shrinkage) plus odd entries ("burring fossil" likely typo for burning, "China Greece" concatenated, "chocolate satellite" as phrase) suggests source MD is noisy web-scraped list, not curated IELTS official frequency data — weak foundation for "intelligent" adaptive system — [source: src/data/words.ts:4, 1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md:19,29,79] (confidence: high, cited)
- **TTS quality risk**: browser speechSynthesis without recorded audio may mispronounce IELTS targets (e.g., "choir", "liaison" not in list but loanwords exist) and varies per OS; no pre-recorded MP3 fallback is wired — could undermine Listen & Type credibility — [source: src/services/audio.ts:68, prompt.md:194-198] (confidence: high, cited)
- **Prior art saturation**: polished typing trainers (keybr, Monkeytype) + SRS flashcards (Anki) + IELTS prep sites already offer listening spelling drills; tasteful gamification alone may not differentiate enough to justify daily-use addiction claim vs Duolingo — [source: ASSUMPTION] (confidence: medium)
- **Implementation already 80% complete**: paying to "build" an already-built app risks rework without new user signal; typecheck passes (0 errors 2026-09-07) implies stable codebase — opportunity cost of polishing vs validating demand — [source: bash typecheck 2026-09-07: 0 errors] (confidence: high, cited)
- **Engagement may still be low**: without push notifications, social accountability, or spaced-repetition scheduling (SM-2/FSRS not implemented — only masteryScore), daily streak alone may not retain; practiceFit is single-mode ("listen" hardcoded, other modes unroutable) limits variety — [source: src/pages/Practice.tsx:32, src/services/adaptiveReview.ts:51-107] (confidence: high, cited)
- **Bundle & maintainability cost**: three + fiber/drei are installed but not observed in use; keeping them inflates build and security surface for zero feature return — [source: package.json:16-18, grep src/** three usage: none found beyond effects/AmbientBackground.tsx?] (confidence: medium, cited)

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Why 884 words vs promised 1200 — is dedup intentional or should phrases be split/fixed (e.g., "annual fee monthly membership" → 2 entries, "burring fossil" corrected)? What is canonical word count for mastery 100%? — source: src/data/words.ts:4]
- [NEEDS CLARIFICATION: Is the voice target en-GB, en-AU, or per-IELTS accent diversity? Should TTS be replaced by pre-recorded audio or cloud TTS (ElevenLabs) for reliability? — source: src/services/audio.ts:14]
- [NEEDS CLARIFICATION: Which practice modes must be user-selectable in v1? Practice.tsx hardcodes "listen"; router has no ?mode= handling, Settings defaultMode is disabled select showing only "listen" — need decision to enable Normal/Random/Smart/Quick10/Challenge50/Mistakes/Weak — source: src/pages/Practice.tsx:32, src/pages/Settings.tsx:102]
- [NEEDS CLARIFICATION: Should XP/level/mastery formula be frozen or A/B tested? Current +6/-12 deltas and sqrt(level) are unvalidated heuristics — need target accuracy improvement (e.g., +8% week-over-week) — source: src/services/scoring.ts:33-48]
- [NEEDS CLARIFICATION: Privacy & data portability — is JSON Import/Export sufficient for backup or is sync (Supabase/Firebase) desired for device mobility? — source: src/services/storage.ts:76-89]
- [NEEDS CLARIFICATION: Public launch ambition vs personal tool — does this need multi-user accounts, moderation, hosting, or remains local-first single-owner forever? Affects auth, hosting, legal — source: prompt.md:715-718]
- [NEEDS CLARIFICATION: Analytics — should Anonymous usage (Plausible/PostHog) be added locally or remain fully offline? Needed to measure "Users & Demand" honestly — source: ASSUMPTION]
- [NEEDS CLARIFICATION: Content licensing — is the 1200-word MD freely reusable for a public product or is curation needed to replace noisy entries before launch? — source: 1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md:1]
- [NEEDS CLARIFICATION: Accessibility audit — target WCAG level (AA?), need for screen-reader live regions for audio prompts, and keyboard trap avoidance in Practice input? — source: prompt.md:872-885]
- [NEEDS CLARIFICATION: Remove or justify three.js dependency — is a 3D/ambient visual planned (DashboardAmbient uses canvas) or can three/drei/fiber/lenis be pruned to cut bundle? — source: package.json:15-22]

## Sources

- D:\code\evrything-ielts\keyboard\prompt.md (host: local, policy: allowlisted — project file)
- D:\code\evrything-ielts\keyboard\1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md (host: local, policy: allowlisted — project file)
- D:\code\evrything-ielts\keyboard\src\data\words.ts (host: local, policy: allowlisted — generated corpus, 884 words)
- D:\code\evrything-ielts\keyboard\scripts\parse-words.mjs (host: local, policy: allowlisted — parsing precedent)
- D:\code\evrything-ielts\keyboard\src\services\adaptiveReview.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\services\mistakeAnalysis.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\services\scoring.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\services\storage.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\services\audio.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\services\statistics.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\store\useAppStore.ts (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\pages\Practice.tsx (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\pages\Dashboard.tsx (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\src\components\layout\AppShell.tsx (host: local, policy: allowlisted)
- D:\code\evrything-ielts\keyboard\package.json (host: local, policy: allowlisted)
- bash typecheck 2026-09-07: tsc -b --noEmit (0 errors) (host: local, policy: allowlisted — verification)
- No external URLs fetched — all evidence is local-first file inspection per URL Trust Policy (allowlisted hosts: github.com etc. were not needed; unrecognized hosts would have required confirmation). External competitive claims marked ASSUMPTION and [UNVERIFIED — fetch skipped] where applicable.
