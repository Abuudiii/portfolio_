# Portfolio · voxel world

Personal portfolio for Abdullah Sheikh.

A first-person, Minecraft-style voxel world. You walk east along a gravel path past one building per stop (UCalgary → Enverus → BlackBerry QNX → Shopify → AMD), each in its company colour with the logo above the door and a themed landmark (clock tower, oil derrick, car, shopping bag, chip with a beacon for the current role). Right-clicking a stop's sign or crafting table opens that role. The Project Village has one chest per project, and the bed in the house at the end opens contact info. You can break and place blocks creative-style; edits last for the session. All textures are generated in code. **Résumé** (or `#resume`, `prefers-reduced-motion`, or no WebGL) shows the same content as a plain page.

Controls: `WASD` move, mouse look, `Space` jump, `Shift` sprint, left-click break, right-click use/place, `1–9` / wheel pick a block, `R` respawn, `F3` debug screen. Touch devices get a joystick, drag-to-look, and JUMP/BREAK/USE buttons. Add `?debug` to expose `window.__vw` for testing.

## Stack

Plain static HTML, CSS, and ES modules. There is no build step and no npm.

- [three.js](https://threejs.org/) 0.186.1 from jsDelivr via an importmap, used only for rendering
- [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [VT323](https://fonts.google.com/specimen/VT323) from Google Fonts

## Files

- `index.html`: stage, HUD, title and pause screens, touch controls, résumé page, dialogs
- `css/style.css`: all styling, including modes, Minecraft-style buttons and panels, and the touch layout
- `js/data.js`: all content (profile, stack, projects, stops)
- `js/dom.js`: small DOM helpers
- `js/blocks.js`: block ids, per-face tiles, hotbar
- `js/textures.js`: procedural 16×16 block textures
- `js/world.js`: voxel storage and the deterministic world layout built from the content
- `js/physics.js`: player movement, collision, and block raycasting
- `js/mesher.js`: chunk meshes with face culling and ambient occlusion
- `js/voxel.js`: three.js rendering, input, and interactions
- `js/main.js`: boot, modes, info dialogs, and the résumé page

`blocks`, `textures`, `world`, `physics`, and `mesher` have no DOM or three.js dependency, so they run under `bun` for testing.

## Run locally

```bash
python3 -m http.server 8080   # http://localhost:8080
```

ES modules don't load from `file://`, so serve the folder instead of opening `index.html` directly.

## Content

All copy lives in `js/data.js`. Edit it there rather than in the other modules.

- `profile`: name, tagline, contact info (the title splash shows `currently`)
- `stack`: technical skills grouped by category
- `projects`: one chest each (an optional `video` opens in the demo modal)
- `stops`: stops in chronological order, each with its logo, building `color`, and bullets; each becomes a building

## Deploy

The site is served as-is by GitHub Pages (`.nojekyll` is included). Either:

- point GitHub Pages at the `voxel-world` branch (root folder), or
- push this branch over `gh-pages`. This **replaces the live site**:

  ```bash
  git push origin voxel-world:gh-pages --force
  ```
