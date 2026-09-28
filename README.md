# Portfolio · pixel quest

Personal portfolio for Abdullah Sheikh.

An 8-bit side-scrolling platformer. You run right through one world per stop (UCalgary → Enverus → BlackBerry QNX → Shopify → AMD); hitting the `?` block in each world opens that role. The Project Arcade has one `?` block per project, and the flagpole and castle at the end open contact info. All art is drawn in code as palette-indexed pixel strings, and all sound is synthesized with WebAudio (off by default; `♪` button or `M`). **Skip to résumé** (or `#resume`, or `prefers-reduced-motion`) shows the same content as a plain page.

Controls: `← →` / `A D` to move, `Space` / `↑` / `W` to jump. Touch devices get on-screen buttons. Add `?debug` to expose `window.__pq` for testing.

## Stack

Plain static HTML, CSS, and ES modules. There is no build step and no npm.

- Canvas 2D, WebAudio, `<dialog>`
- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and [VT323](https://fonts.google.com/specimen/VT323) from Google Fonts

## Files

- `index.html`: game stage, HUD, title screen, touch controls, résumé page, dialogs
- `css/style.css`: all styling, including modes, NES-style panels, and the touch layout
- `js/data.js`: all content (profile, stack, projects, stops)
- `js/dom.js`: small DOM helpers
- `js/level.js`: tile ids and the level layout built from the content
- `js/engine.js`: pure physics (player, enemies, tile collisions)
- `js/sprites.js`: palette, pixel-string sprites, and sprite/logo baking
- `js/audio.js`: synthesized sound effects
- `js/game.js`: game loop, input, camera, and rendering
- `js/main.js`: boot, modes, info dialogs, and the résumé page

## Run locally

```bash
python3 -m http.server 8080   # http://localhost:8080
```

ES modules don't load from `file://`, so serve the folder instead of opening `index.html` directly.

## Content

All copy lives in `js/data.js`. Edit it there rather than in the other modules.

- `profile`: name, tagline, contact info
- `stack`: technical skills grouped by category
- `projects`: project cards (an optional `video` opens in the demo modal)
- `stops`: stops in chronological order, each with its logo, building `color`, and bullets; each becomes a world in the level

## Deploy

The site is served as-is by GitHub Pages (`.nojekyll` is included). Either:

- point GitHub Pages at the `pixel-quest` branch (root folder), or
- push this branch over `gh-pages`. This **replaces the live site**:

  ```bash
  git push origin pixel-quest:gh-pages --force
  ```
