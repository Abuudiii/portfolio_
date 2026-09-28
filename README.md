# Portfolio · globe journey

Personal portfolio for Abdullah Sheikh.

A scroll-driven motion graphic: it opens on a satellite globe, and each scroll gesture (wheel, swipe, arrow keys) plays a timed flight to the next or previous office, fades into a dark 3D city with OSM building extrusions, and shows that role's card. Between cities it zooms back out to the globe. The page ends with projects and contact, which scroll normally.

## Stack

Plain static HTML, CSS, and ES modules. There is no build step and no npm.

- [MapLibre GL JS](https://maplibre.org/) 6 (globe projection), loaded from unpkg
- [OpenFreeMap](https://openfreemap.org/) `dark` style for vector tiles and 3D buildings
- Esri World Imagery for the satellite layer

## Files

- `index.html`: page shell and fixed overlays
- `css/style.css`: all styling, including map beacons and the mobile layout
- `js/data.js`: all content (profile, stack, projects, journey stops)
- `js/camera.js`: pure camera math for the scroll timeline
- `js/map.js`: MapLibre globe, style tweaks, beacons, route line
- `js/stepper.js`: turns scroll gestures into timed flights between journey stops
- `js/main.js`: DOM rendering and the scroll-driven animation loop

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
- `stops`: journey stops in chronological order, each with its office coordinates, camera zoom, pitch, and bearing, and card bullets
- `intro` / `outro`: globe cameras for the start and end of the scroll

## Deploy

The site is served as-is by GitHub Pages (`.nojekyll` is included). Either:

- point GitHub Pages at the `motion-globe` branch (root folder), or
- push this branch over `gh-pages`. This **replaces the live site**:

  ```bash
  git push origin motion-globe:gh-pages --force
  ```
