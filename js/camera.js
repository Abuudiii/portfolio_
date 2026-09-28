// Pure camera math for the scroll-driven globe journey. No DOM access except
// reading offsets in buildTimeline, no MapLibre dependency.

const DEG = Math.PI / 180;

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Shortest-arc interpolation between two angles in degrees. */
export function lerpAngle(a, b, t) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

/** Great-circle distance in km between [lng, lat] points. */
export function haversineKm(a, b) {
  const dLat = (b[1] - a[1]) * DEG;
  const dLng = (b[0] - a[0]) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toVec([lng, lat]) {
  const cl = Math.cos(lat * DEG);
  return [cl * Math.cos(lng * DEG), cl * Math.sin(lng * DEG), Math.sin(lat * DEG)];
}

/** Great-circle interpolation between [lng, lat] points. */
export function slerpLngLat(a, b, t) {
  const va = toVec(a);
  const vb = toVec(b);
  const dot = clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-9) return [a[0], a[1]];
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  const x = wa * va[0] + wb * vb[0];
  const y = wa * va[1] + wb * vb[1];
  const z = wa * va[2] + wb * vb[2];
  return [Math.atan2(y, x) / DEG, Math.atan2(z, Math.hypot(x, y)) / DEG];
}

export const transitZoomMid = (km) => clamp(13 - Math.log2(1 + km / 2), 2.5, 13);

/** Fly-to style camera between two cameras {center, zoom, pitch, bearing}. */
export function interpolateTransit(A, B, t) {
  const e = easeInOutCubic(clamp(t, 0, 1));
  const ct = smoothstep(0.25, 0.75, e);
  const center = slerpLngLat(A.center, B.center, ct);
  const base = lerp(A.zoom, B.zoom, e);
  const zMid = transitZoomMid(haversineKm(A.center, B.center));
  const zoom =
    zMid < Math.min(A.zoom, B.zoom)
      ? base - (base - zMid) * Math.pow(Math.sin(Math.PI * e), 0.6)
      : base;
  const pitch = lerp(A.pitch, B.pitch, e) * (1 - Math.sin(Math.PI * e));
  const bearing = lerpAngle(A.bearing, B.bearing, e);
  return { center, zoom, pitch, bearing };
}

const parseRef = (v) => (v === 'intro' || v === 'outro' ? v : Number(v));

/** Turn [data-seg] elements into timeline segments with document offsets. */
export function buildTimeline(segEls) {
  return Array.from(segEls, (el) => {
    const kind = el.dataset.seg;
    const seg = { kind, top: el.offsetTop, height: el.offsetHeight };
    if (kind === 'transit') {
      seg.from = parseRef(el.dataset.from);
      seg.to = parseRef(el.dataset.to);
    } else if (kind === 'stop') {
      seg.stop = Number(el.dataset.stop);
    }
    return seg;
  });
}

function globeCam(base, rotDeg, mobile) {
  return {
    center: [base.center[0] + rotDeg, base.center[1]],
    zoom: base.zoom - (mobile ? 0.5 : 0),
    pitch: base.pitch,
    bearing: base.bearing,
  };
}

function stopCam(stop, p, mobile) {
  return {
    center: stop.center,
    zoom: stop.zoom + 0.3 * p - (mobile ? 0.6 : 0),
    pitch: stop.pitch,
    bearing: stop.bearing + lerp(-12, 12, p),
  };
}

/** Camera and overlay state for a scroll position. */
export function sampleTimeline(timeline, scrollY, { stops, intro, outro, rotDeg = 0, mobile = false }) {
  let idx = timeline.findIndex((s) => scrollY < s.top + s.height);
  if (idx === -1) idx = timeline.length - 1;
  const seg = timeline[idx];
  const p = clamp((scrollY - seg.top) / seg.height, 0, 1);

  // `hold` is the stop-hold progress to use when the ref is a stop.
  const resolve = (ref, hold) => {
    if (ref === 'intro') return globeCam(intro, rotDeg, mobile);
    if (ref === 'outro') return globeCam(outro, rotDeg, mobile);
    return stopCam(stops[ref], hold, mobile);
  };

  let camera;
  let activeStop = null;
  if (seg.kind === 'intro') {
    camera = resolve('intro');
  } else if (seg.kind === 'outro') {
    camera = resolve('outro');
  } else if (seg.kind === 'stop') {
    camera = stopCam(stops[seg.stop], p, mobile);
    activeStop = seg.stop;
  } else {
    camera = interpolateTransit(resolve(seg.from, 1), resolve(seg.to, 0), p);
    const ref = p > 0.5 ? seg.to : seg.from;
    activeStop = typeof ref === 'number' ? ref : null;
  }
  return { camera, seg: idx, p, activeStop };
}
