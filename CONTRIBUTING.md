# Contributing to Lexis

Thanks for helping! This is an open-source IELTS spelling trainer by Alaminnna.

## Quick Start

```bash
git clone https://github.com/alaminnna/lexis-ielts-spelling-trainer.git
cd lexis-ielts-spelling-trainer
npm install
npm run gen:words
npm run dev
```

## Before PR

```bash
npm run typecheck
npm run build
```

Ensure `Learning` stepper (Recognize→Meaning→Spelling→Recall) still has no vertical expand — horizontal swipe only.

## Commit

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
- Keep PR focused (one feature/fix)

## Code Style

- TypeScript strict, no `any` without reason
- Use `src/storage/` facades — never scatter `localStorage.setItem` in components
- Respect `prefers-reduced-motion`, keep landing light (no dashboard API calls on `/`)

## Reporting Bugs

Use GitHub Issues with template. Include browser, steps, expected vs actual.

## Questions?

Open a Discussion or email `ikalamin0@gmail.com`.

© Al A Min — alaminnna.ami.bd
