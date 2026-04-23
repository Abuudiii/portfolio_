# Portfolio · v4

Personal portfolio for Abdullah Sheikh.

Editorial-minimal design. Warm ivory background, Instrument Serif display, JetBrains Mono accents.

## Stack

- Vite 5 · React 18 · TypeScript 5
- Tailwind CSS 3
- Framer Motion 11
- React Router 6 (HashRouter for GitHub Pages compatibility)

## Pages

- `/` : Intro, work, education, stack
- `/projects` : Curated selection of work (Metal Ray Tracer, OpsForge, CivicPulse, PortoBeats, PulseLink)
- `/contact` : Minimal contact page

## Dev

```bash
pnpm install
pnpm dev                 # http://localhost:5173
```

## Build

```bash
pnpm build               # tsc + vite build, output to dist/
pnpm preview             # serve dist/
```

## Deploy

Deploys to GitHub Pages via `gh-pages` branch. Update the `homepage` field in `package.json` to point at the correct repo URL, then:

```bash
pnpm deploy
```

## Content

All copy lives in `src/data/*.ts`. Edit there rather than touching component files.

- `profile.ts` : name, tagline, contact info
- `education.ts` : school entries
- `experience.ts` : job history (AMD, Shopify, BlackBerry, Enverus)
- `stack.ts` : technical skills grouped by category
- `projects.ts` : project cards

## Prior versions

The previous portfolio (Matrix/hacker theme) lives at `oldportfolio/` for reference.
