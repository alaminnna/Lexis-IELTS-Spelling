# Lexis — IELTS Spelling Trainer

> Premium, local-first IELTS spelling trainer — learn, recall, practice, master. No login. Offline. Private per-browser.

Live: **`/` Landing** · App: **`/dashboard` `/learning` `/practice`** · Made by [**Al A Min — Alaminnna**](https://alaminnna.ami.bd) • Dhaka, Bangladesh

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8)](https://vite-pwa-org.netlify.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

![Lexis preview](public/favicon.svg)

### ✨ Features

- **884 IELTS words** (1200 most repeated → parsed to 36 categories)
- **4-step Learning** — Recognize → Meaning → Spelling → Recall (horizontal stepper, no vertical expand)
- **8 Practice modes** — Normal / Listen & Type / Mistakes / Weak / Quick 10 / Challenge 50 / Random / Smart (adaptive)
- **Adaptive engine** — weak words surface more (`wrong×`, accuracy, recency, gap, `nextReviewAt`)
- **Mistake intelligence** — missing / extra / transposition / repeated / vowel / consonant
- **Progress** — mastery 0–100 (Critical 0–39 → Mastered 95–100), streak, XP/level, heatmap
- **Local-first** — IndexedDB `ielts-spelling-db` + `localStorage` mirror, `STORAGE_VERSION=1`, `src/storage/` facades, `BroadcastChannel` sync, per-browser isolated
- **PWA** — `vite-plugin-pwa` `generateSW` `registerType:prompt` 4MB precache, offline `Words/Learning/Practice/Dashboard` usable
- **Landing + Dashboard split** — `/` public marketing, `/dashboard` app (preserved), `/about` builder page

### Routes

| Path | Page |
|------|------|
| `/` | Landing — hero, why spelling matters, how it works, adaptive, CTA |
| `/about` | About — **Al A Min** info from [alaminnna.ami.bd](https://alaminnna.ami.bd) (inside app, nav bar keeps) |
| `/dashboard` | Dashboard — `How you're doing, Name` + honest zero-state |
| `/learning` | Learning — stepper, chunk tips, audio slow, recall modes |
| `/practice` | Practice — keyboard-first (Enter Space R N Esc) |
| `/words` `/statistics` `/mistakes` `/settings` | Library, charts, mistakes, profile + Data & Privacy |

### Quick Start

```bash
git clone https://github.com/alaminnna/lexis-ielts-spelling-trainer.git
cd lexis-ielts-spelling-trainer
npm install
npm run gen:words   # 884 words → src/data/words.ts
npm run dev         # http://localhost:5173
npm run build && npm run preview  # production
npm run typecheck   # tsc -b --noEmit
```

Node >=20 required.

### Tech

`React 19` `React Router 7` `Vite 8` `Zustand 5` `idb 8` `Tailwind 3.4` `Framer Motion 11` `GSAP 3` `Recharts` `date-fns` `clsx`.

PWA: `vite-plugin-pwa` `Workbox` `navigateFallback:index.html` (SPA), `vercel.json` + `public/_redirects`.

### Project Structure

```
src/
  pages/      Landing, Dashboard, Learning (stepper), Practice, Words, About
  components/ onboarding/Onboarding, layout/AppShell (sidebar persists on /about)
  storage/    storageKeys, userStorage, progressStorage, settingsStorage, wordStorage
  services/   storage (envelope), adaptiveReview, mistakeAnalysis, audio
  store/      useAppStore (profile, clearProgress, clearAllData)
public/       manifest.webmanifest, favicon.svg
specs/001-ielts-spelling/  plan, research, data-model, tasks
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome! Please run `npm run typecheck && npm run build` before PR.

### Security

See [SECURITY.md](SECURITY.md) to report vulnerabilities privately to `ikalamin0@gmail.com`.

### Author

**Al A Min — Alaminnna**

AI-Powered Full Stack Developer — Dhaka, Bangladesh

- Website: [alaminnna.ami.bd](https://alaminnna.ami.bd)
- GitHub: [github.com/alaminnna](https://github.com/alaminnna)
- LinkedIn: [linkedin.com/in/alaminnna](https://linkedin.com/in/alaminnna)
- Email: `ikalamin0@gmail.com`

### License

[MIT](LICENSE) © 2026 Al A Min — Alaminnna. Free for personal & commercial use.

### Deploy

Vercel / Netlify auto-detect Vite. SPA fallback via `vercel.json` rewrites + `public/_redirects`. Hashed assets `Cache-Control: immutable`.
