# Portfolio · v5

Personal portfolio for Abdullah Sheikh: two full-screen 1-bit panels. The first has experience on the left and a dithered Earth + Moon orbiting on the right. Scrolling down reaches projects beside a ray-traced black hole, with contacts at the bottom.

## Stack

- Vite 5 · React 18 · TypeScript 5
- Tailwind CSS 3
- No animation library: the scenes are hand-rolled canvas renderers

## How the scenes work

`src/lib/dither.ts` holds the shared base class `DitherScene`. It owns the canvas, a 1-bit frame buffer, a static R2 ordered-dither mask and the starfield, plus `addHeroGalaxy` for a large Andromeda-style spiral (used on the Earth panel). Galaxy footprints are precomputed and repainted every frame by `paintGalaxies` with their trailing spiral arms rotated, so the galaxy slowly spins (one turn every 70–120 s). Scenes shade a continuous intensity per pixel and threshold it against the mask, so every pixel is one of two colours.

- `src/lib/orbit.ts` (`OrbitScene`): Earth, Moon, a dotted atmosphere rim (evenly spaced by arc length, so it stays round), orbit path, nebula and the occasional meteor. The Moon and Earth shadow each other, and the draw order flips depending on which side of the Earth the Moon is on. The dotted orbit path stays behind the planet.
- `src/lib/spaceflight.ts`: the ISS orbit, the Moon's orbit, and a Starship mission as pure functions of time. Every third ISS orbit (48 s, first launch at 6 s) a stack launches from the sunlit limb, the booster separates and flies back to the pad, and the ship flies to its target, stays, then comes back, reenters and lands. Missions alternate between targets with the same flight: docking under the ISS's central module for four seconds, or landing on the Moon's Earth-facing upper limb (first Moon run at 54 s) and riding it for one full lunar orbit, round the back of the Earth, before lifting off from the same spot. The Moon orbits every 24 s, so every Moon run finds it at the same spot front-left of the Earth. `OrbitScene` draws the ISS as a sprite with a solid truss and dithered solar arrays and modules, shaded by how sunlit the station is; the rockets are short oriented lines. Both get a paper outline so they read over the planets, and each rocket carries a depth so the Earth and Moon hide it correctly.
- `src/lib/blackhole.ts` (`BlackHoleScene`): a Schwarzschild black hole with a thin accretion disk. Each resize ray-traces light paths once (about 150 ms) into a lens map: rays near the hole are integrated through the bending, and further out the weak-field deflection is applied analytically. Every frame (about 1 ms) the starfield drifts slowly upward and is looked up through that map, so stars stream past live, bending into arcs and doubled images near the Einstein ring, while the disk spins (Keplerian speeds, Doppler-brightened on the approaching side). Lookups keep the source row unrounded, so magnified arcs flow instead of stepping.

`src/components/Scene.tsx` builds a scene when it nears the viewport, animates it only while visible, and re-fits it 150 ms after a resize settles. It sizes the buffer so each dither dot is a whole number of device pixels and upscales it with `image-rendering: pixelated`. With `prefers-reduced-motion` it draws one static frame.

`src/components/Sun.tsx` draws a small distant Sun in the first panel's text column on desktop, between the header and the experience list: a limb-darkened sphere with a crisp rim, boiling granulation over slowly drifting supergranulation, sunspot groups (dark umbra, grey penumbra) that rotate across the face once every 45 s and disappear round the limb, and a faint corona with shifting streamers. On top of that: a prominence every 6 s in one of four kinds (loop, tall arch, a loop raining plasma knots back down its legs, or an eruptive one that rises, snaps at its legs and drifts off); a flare every 5.3 s, where a sunspot flashes white, the corona beside it brightens and a spray of particles shoots off the limb; and a coronal mass ejection every 37 s (first at 12 s), a ragged bubble that balloons out into the open sky on the right and fades. The canvas extends to the right of the Sun to give eruptions room without crossing the text. It runs on `src/lib/useDitherCanvas.ts`, which dithers a small transparent canvas with the scenes' R2 mask, reads ink and paper from the page's colours, and animates only while on screen.

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
