import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';
import { officeFootprints } from './offices.js';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ACCENT = '#ED1C24';
const LABEL_ANCHOR = 'highway_name_other';
const HIDDEN_LAYERS = [
  'road_oneway',
  'road_oneway_opposite',
  'highway_name_other',
  'highway_name_motorway',
  'water_name',
  'place_other',
  'place_suburb',
  'place_village',
];

let beacons = [];

export function createMap(container, stops, intro) {
  let map;
  try {
    map = new maplibregl.Map({
      container,
      style: STYLE_URL,
      center: intro.center,
      zoom: intro.zoom,
      interactive: false,
      maxPitch: 75,
      fadeDuration: 0,
      // The camera moves every frame during flights; don't abort in-flight tile loads on each zoom step.
      cancelPendingTileRequestsWhileZooming: false,
      attributionControl: { compact: true },
    });
  } catch (err) {
    console.warn('Map unavailable:', err);
    return null;
  }

  map.on('style.load', () => {
    map.setProjection({ type: 'globe' });
    customizeStyle(map);
  });
  map.on('error', (e) => console.warn('Map error:', e.error ?? e));
  // Compact attribution starts expanded; collapse it so it doesn't cover the HUD.
  map.once('idle', () => {
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });

  beacons = stops.map((stop, i) => {
    const element = buildBeacon(stop, i);
    new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(stop.center).addTo(map);
    return element;
  });

  return map;
}

export function setActiveBeacon(i) {
  beacons.forEach((el, j) => el.classList.toggle('is-active', j === i));
}

export function setRoute(map, coordsList) {
  const source = map.getSource('route');
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: coordsList.map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    })),
  });
}

function buildBeacon(stop, i) {
  const el = document.createElement('div');
  el.className = 'beacon';
  el.dataset.stop = String(i);
  const ring = document.createElement('span');
  ring.className = 'beacon-ring';
  const dot = document.createElement('span');
  dot.className = 'beacon-dot';
  const label = document.createElement('span');
  label.className = 'beacon-label';
  label.textContent = `${stop.org} · ${stop.city.split(',')[0]}`;
  el.append(ring, dot, label);
  return el;
}

function customizeStyle(map) {
  const beforeId = map.getLayer(LABEL_ANCHOR)
    ? LABEL_ANCHOR
    : map.getStyle().layers.find((l) => l.type === 'symbol')?.id;

  if (!map.getSource('satellite')) {
    map.addSource('satellite', {
      type: 'raster',
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      // Imagery is fading out from z10 to z14, so overzoomed z12 tiles look the same with far fewer requests.
      maxzoom: 12,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    });
  }
  if (!map.getLayer('satellite')) {
    map.addLayer(
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        // Fully faded out by z14; stopping the layer there keeps it from requesting street-level imagery.
        maxzoom: 14,
        paint: {
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 0],
          'raster-fade-duration': 200,
        },
      },
      beforeId,
    );
  }

  const extrusion = (id, paint, filter) => {
    if (map.getLayer(id)) return;
    const layer = {
      id,
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['get', 'render_height']],
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-vertical-gradient': true,
        ...paint,
      },
    };
    if (filter) layer.filter = filter;
    map.addLayer(layer, beforeId);
  };

  extrusion('buildings-3d', {
    'fill-extrusion-color': [
      'interpolate', ['linear'], ['get', 'render_height'],
      0, '#1b1e24',
      60, '#2a2f3a',
      200, '#3a4252',
    ],
    'fill-extrusion-opacity': 0.92,
  });
  if (!map.getSource('offices')) {
    map.addSource('offices', { type: 'geojson', data: officeFootprints });
  }
  if (!map.getLayer('buildings-office')) {
    map.addLayer(
      {
        id: 'buildings-office',
        type: 'fill-extrusion',
        source: 'offices',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': ACCENT,
          'fill-extrusion-opacity': 1,
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['get', 'render_height']],
          'fill-extrusion-base': ['get', 'render_min_height'],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      beforeId,
    );
  }

  for (const id of HIDDEN_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  }

  if (!map.getSource('route')) {
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }
  const routeLayout = { 'line-cap': 'round', 'line-join': 'round' };
  if (!map.getLayer('route-glow')) {
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: routeLayout,
      paint: { 'line-color': ACCENT, 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.35 },
    });
  }
  if (!map.getLayer('route-line')) {
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: routeLayout,
      paint: { 'line-color': ACCENT, 'line-width': 2 },
    });
  }

  try {
    map.setSky({
      'sky-color': '#0b1020',
      'horizon-color': '#1a2a4a',
      'fog-color': '#0b1020',
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.8,
      'fog-ground-blend': 0.9,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    });
  } catch (err) {
    console.warn('Sky unavailable:', err);
  }
}

// Warm the browser HTTP cache (both tile hosts send long max-age + CORS) with exactly the tiles
// the journey will request: a hidden map with the same size, padding and style is jumped through
// sampled journey cameras, waiting for each view's tiles. Hand-computed tile lists missed most of
// what the pitched arrival views and the in-flight transit frames actually load.
export function warmJourney(cameras, padding) {
  if (navigator.connection?.saveData) return;
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;visibility:hidden;pointer-events:none;z-index:-1;`;
  document.body.append(holder);
  let warm;
  try {
    warm = new maplibregl.Map({
      container: holder,
      style: STYLE_URL,
      center: cameras[0].center,
      zoom: cameras[0].zoom,
      interactive: false,
      maxPitch: 75,
      fadeDuration: 0,
      attributionControl: false,
    });
  } catch {
    holder.remove();
    return;
  }
  warm.on('error', () => {}); // Best effort: a failed tile just loads on demand later.
  warm.on('style.load', () => {
    warm.setProjection({ type: 'globe' });
    customizeStyle(warm);
  });
  const settle = () =>
    new Promise((resolve) => {
      const timer = setTimeout(done, 8000);
      function done() {
        clearTimeout(timer);
        warm.off('idle', done);
        resolve();
      }
      warm.on('idle', done);
    });
  warm.once('load', async () => {
    warm.setPadding(padding);
    for (const cam of cameras) {
      warm.jumpTo(cam);
      await settle();
    }
    warm.remove();
    holder.remove();
  });
}
