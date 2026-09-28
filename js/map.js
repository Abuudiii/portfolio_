import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';

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
      attributionControl: { compact: true },
    });
  } catch (err) {
    console.warn('Map unavailable:', err);
    return null;
  }

  map.on('style.load', () => {
    map.setProjection({ type: 'globe' });
    customizeStyle(map, stops);
  });
  map.on('error', (e) => console.warn('Map error:', e.error ?? e));
  trackOffices(map, stops);
  // Compact attribution starts expanded; collapse it so it doesn't cover the HUD.
  map.once('idle', () => {
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });
  map.once('load', () => prefetchStops(map, stops));

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

function customizeStyle(map, stops) {
  const beforeId = map.getLayer(LABEL_ANCHOR)
    ? LABEL_ANCHOR
    : map.getStyle().layers.find((l) => l.type === 'symbol')?.id;

  if (!map.getSource('satellite')) {
    map.addSource('satellite', {
      type: 'raster',
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 19,
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
          'raster-fade-duration': 0,
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
    map.addSource('offices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
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

// Expression filters can't reliably pick building polygons around a point (`within` ignores
// polygons; `distance` misfires on some tiles), so office footprints are found from loaded tiles:
// a building matches when it contains the office point or has a vertex within highlightRadiusM.
// Matches are cached per stop and copied into the `offices` GeoJSON source.
function trackOffices(map, stops) {
  const found = stops.map(() => null);
  const refresh = () => {
    // Below z14 the tiles merge neighbouring footprints into one MultiPolygon, so wait for z14 tiles.
    if (found.every(Boolean) || !map.getSource('offices') || map.getZoom() < 14) return;
    let changed = false;
    let buildings;
    stops.forEach((stop, i) => {
      if (found[i]) return;
      buildings ??= map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' });
      // Keep only the matching parts of each (Multi)Polygon, copied to plain GeoJSON because
      // queried features carry non-serializable internals the worker can't clone.
      const hits = buildings.flatMap((f) =>
        polygonsOf(f.geometry)
          .filter((rings) => matchesOffice(rings, stop))
          .map((rings) => ({
            type: 'Feature',
            properties: { render_height: f.properties.render_height, render_min_height: f.properties.render_min_height },
            geometry: { type: 'Polygon', coordinates: JSON.parse(JSON.stringify(rings)) },
          })),
      );
      if (!hits.length) return;
      found[i] = hits;
      changed = true;
    });
    if (changed) {
      map.getSource('offices').setData({ type: 'FeatureCollection', features: found.filter(Boolean).flat() });
    }
  };
  // `idle` alone can fire before building tiles arrive, so also re-check when vector tiles finish.
  map.on('idle', refresh);
  map.on('sourcedata', (e) => {
    if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) refresh();
  });
}

function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function matchesOffice(rings, stop) {
  const [lng0, lat0] = stop.center;
  const mPerLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const r2 = stop.highlightRadiusM ** 2;
  const outer = rings[0];
  let inside = false;
  for (let a = 0, b = outer.length - 1; a < outer.length; b = a++) {
    const [xa, ya] = outer[a];
    const [xb, yb] = outer[b];
    if (ya > lat0 !== yb > lat0 && lng0 < ((xb - xa) * (lat0 - ya)) / (yb - ya) + xa) inside = !inside;
  }
  if (inside) return true;
  return outer.some(([x, y]) => ((x - lng0) * mPerLng) ** 2 + ((y - lat0) * 111320) ** 2 <= r2);
}

// Warm the browser HTTP cache (both tile hosts send long max-age + CORS) with the tiles each
// office flyover needs, so zooming in doesn't paint the city tile by tile. The requests match
// MapLibre's own (CORS, same URL), so the cached responses are reused when the camera arrives.
function prefetchStops(map, stops) {
  const vectorTemplate = map.getSource('openmaptiles')?.tiles?.[0];
  const urls = new Set();
  const add = (template, z, [lng, lat], radius) => {
    const n = 2 ** z;
    const cx = Math.floor(((lng + 180) / 360) * n);
    const latR = (lat * Math.PI) / 180;
    const cy = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        urls.add(template.replace('{z}', z).replace('{x}', cx + dx).replace('{y}', cy + dy));
      }
    }
  };
  for (const stop of stops) {
    // Satellite imagery for the descent, then vector tiles (source maxzoom 14) for the city.
    for (let z = 8; z <= 13; z++) add(SATELLITE_TILES, z, stop.center, 1);
    if (vectorTemplate) {
      add(vectorTemplate, 12, stop.center, 1);
      add(vectorTemplate, 13, stop.center, 1);
      add(vectorTemplate, 14, stop.center, 2);
    }
  }
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      try {
        // Drain the body so the full response lands in the cache.
        await (await fetch(queue.shift(), { mode: 'cors', priority: 'low' })).arrayBuffer();
      } catch {
        // Best effort: a failed prefetch just means that tile loads on demand.
      }
    }
  };
  for (let i = 0; i < 4; i++) worker();
}
