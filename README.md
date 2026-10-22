# Portfolio · v5

Personal portfolio for Abdullah Sheikh: a single 1-bit page. Experience on the left, contacts at the bottom, and a dithered Earth + Moon orbiting on a canvas.

## Stack

- Vite 5 · React 18 · TypeScript 5
- Tailwind CSS 3
- No animation library: the scene is a hand-rolled canvas renderer

## How the orbit works

`src/lib/orbit.ts` shades the Earth, Moon, atmosphere, orbit path, starfield, nebula, and the occasional meteor into a low-res buffer each frame, then thresholds every pixel against a static R2 ordered-dither mask. Each pixel is one of two colours. Shading and texture lookups are per-pixel, the Moon and Earth shadow each other, and the draw order flips depending on which side of the Earth the Moon is on.

`src/components/Orbit.tsx` sizes the buffer so each dither dot is a whole number of device pixels, and upscales it with `image-rendering: pixelated`. With `prefers-reduced-motion` it draws one static frame.

The two colours are `paper` / `ink` in `tailwind.config.ts` and `PAPER` / `INK` in `src/lib/orbit.ts`. Keep them in sync.

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

Deploys to GitHub Pages through the `gh-pages` branch:

```bash
pnpm run deploy          # `pnpm deploy` is a built-in pnpm command, so `run` is required
```

## Content

All copy is in `src/data/`:

- `profile.ts`: name, tagline, location, school, email, links
- `experience.ts`: one line per role

`public/resume.pdf` is the linked resume.
