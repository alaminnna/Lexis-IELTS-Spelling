# Intake: IELTS Spelling Training Web App (Lexis)

- **Slug**: ielts-spelling-training
- **Created**: 2026-09-07
- **Status**: intake
- **Source**: prompt.md (1162 lines) + codebase inspection + word list MD

## Idea Summary

A **premium personal IELTS Spelling Training Web App** codenamed **Lexis**. The product vision is "Duolingo engagement + Linear polish + modern SaaS dashboard + focused typing trainer" but with original UI, not a clone. It is a single-user, local-first, keyboard-first spelling trainer built specifically for the author's daily IELTS Listening spelling practice. Optimised around *personal mistakes and weakness tracking* rather than generic vocabulary drilling.

## Core Problem

IELTS Listening section penalises spelling errors heavily. The 1200 most commonly repeated words in IELTS Listening (MD source) contain many acoustically similar / double-letter / vowel-sensitive words (accommodation, necessary, questionnaire, etc.) where small orthographic errors cost marks. Generic flashcard apps do not:
- simulate Listen & Type (audio-only) exam conditions,
- diagnose *why* spelling failed (missing/extra/transposition/repeated-letter),
- adaptively resurface weak words,
- track streaks/XP/mastery in a premium, distraction-free typing experience.

## Intended User

Single primary user (author) - daily self-directed learner preparing for IELTS, needs keyboard-first speed, audio replay, offline progress, beautiful UX that rewards daily use. Secondary audience: any IELTS candidate with identical need (potential public launch).

## Scope From Prompt

Must include:
- `/practice` as heart (typing + audio + streak + progress + smooth feedback)
- 8 practice modes: Normal, Listen & Type, Mistake Mode, Weak Words, Quick 10, Challenge 50, Random, Smart (adaptive)
- Intelligent adaptive algorithm (masteryScore 0-100 -> Critical 0-39 / Weak 40-59 / Learning 60-79 / Strong 80-94 / Mastered 95-100)
- Mistake intelligence (edit-distance categories: missing, extra, wrong, transposition, repeated, vowel, consonant, multiple)
- Weakness engine (/mistakes), Dashboard, Word Library (/words  with search/category/mastery filters + detail view), Visual analytics (accuracy over time, activity heatmap, mastery distribution, mistake breakdown, category performance), Daily goal, Streak, Tasteful gamification (XP/levels/achievements), Local-first IndexedDB, Import/Export, Settings, Empty/Loading states, Animations respecting prefers-reduced-motion, Responsive 375-1920px, a11y, performance optimisations, premium design system (sophisticated neutrals + one accent).
- Tech: React + TypeScript + Tailwind, structured src/data, store, services, hooks.

## Current Repo State (observed 2026-09-07)

- Project name `ielts-spelling` v1.0.0, Vite 8 + React 19.2.8 + TypeScript 6 + Zustand 5 + Framer Motion 11 + GSAP 3.15 + idb 8 + recharts 2.13 + react-router-dom 7.3, Tailwind 3.4 (src 34 files, ~7131 lines data).
- `src/data/words.ts` AUTO-GENERATED 2026-09-07: 884 words / 36 categories / hash d858b220ce03 via `scripts/parse-words.mjs`. Word type: id, word, normalized, category, categorySlug, difficulty (easy/medium/hard by length heuristic).
- App shell with responsive sidebar/mobile nav, daily goal bar, Sound global init (AppShell.tsx:39-234).
- Practice page implements Listen & Type with Web Speech API + Web Audio chimes, GSAP progress + card motion, state machine typing/correct/wrong/revealed, keyboard shortcuts Enter/ Space(not when typing)/R, result recording via useAppStore.recordAttempt (Practice.tsx:30-423).
- Dashboard: hero with ProgressRing, daily goal, XP/level, weak words top 6, recent sessions, quick CTA (Dashboard.tsx:17-187).
- Mistakes, Words, Statistics, Settings pages implemented with varying completeness (see research gaps).
- Unknowns: whether adaptive weighting, mistake classification, scoring deltas are empirically validated; whether SpeechSynthesis quality is acceptable vs pre-recorded TTS; whether 884 vs 1200 word count is acceptable; whether public launch is intended or remains personal.
