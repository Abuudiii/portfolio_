# Portfolio · v5

Personal portfolio for Abdullah Sheikh: two full-screen 1-bit panels. The first has experience on the left and a dithered Earth + Moon orbiting on the right. Scrolling down reaches projects beside a ray-traced black hole, with contacts at the bottom.

## Stack

- Vite 5 · React 18 · TypeScript 5
- Tailwind CSS 3
- No animation library: the scenes are hand-rolled canvas renderers

## How the scenes work

`src/lib/dither.ts` holds the shared base class `DitherScene`. It owns the canvas, a 1-bit frame buffer, a static R2 ordered-dither mask and the sky: stars plus small dithered galaxies, with `addHeroGalaxy` for each scene's large Andromeda-style spiral and its companion. Scenes shade a continuous intensity per pixel and threshold it against the mask, so every pixel is one of two colours.

- `src/lib/orbit.ts` (`OrbitScene`): Earth, Moon, atmosphere, orbit path, nebula and the occasional meteor. The Moon and Earth shadow each other, and the draw order flips depending on which side of the Earth the Moon is on. The near arc of the Moon's orbit is drawn over the planet.
- `src/lib/spaceflight.ts`: the ISS orbit and a Starship mission as pure functions of time. Every third ISS orbit a stack launches from the sunlit limb, the booster separates and flies back to the pad, the ship docks with the ISS, then undocks, reenters and lands. `OrbitScene` draws the ISS as a sprite with a solid truss and dithered solar arrays and modules, shaded by how sunlit the station is; the rockets are short oriented lines. Both get a paper outline so they read over the planet.
- `src/lib/blackhole.ts` (`BlackHoleScene`): a Schwarzschild black hole with a thin accretion disk. Each resize ray-traces light paths once (about 150–300 ms): rays near the hole are integrated through the bending, and further out the weak-field deflection is applied analytically to lens the stars. Every frame then only spins the disk texture (Keplerian speeds, Doppler-brightened on the approaching side) and re-dithers those pixels.

`src/components/Scene.tsx` builds a scene when it nears the viewport, animates it only while visible, and re-fits it 150 ms after a resize settles. It sizes the buffer so each dither dot is a whole number of device pixels and upscales it with `image-rendering: pixelated`. With `prefers-reduced-motion` it draws one static frame.

`src/lib/sprites.ts` draws the small animated 16x16 icons beside each role and project (GPU fans, rover in snow, chip interrupts, neurons firing, a telescope watching a transit, and so on) from simple pixel primitives. `src/components/PixelIcon.tsx` cycles their frames at 2 CSS px per pixel, and shows only the first frame under `prefers-reduced-motion`.

The two colours are `paper` / `ink` in `tailwind.config.ts` and `PAPER` / `INK` in `src/lib/dither.ts`. Keep them in sync.

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
- `projects.ts`: name (links to the project), context, one-paragraph summary

`public/resume.pdf` is the linked resume.
