import { useRef } from 'react';
import { TAU, fbm3 } from '../lib/dither';
import { useDitherCanvas, type DitherPainter } from '../lib/useDitherCanvas';

/**
 * Canvas size in dither pixels. The Sun sits at the left; the extra width on the right is open
 * sky (the gap toward the Earth) where eruptions and coronal mass ejections have room to travel
 * without crossing the text above and below.
 */
const W = 120;
const H = 64;
const FPS = 12;

const SUN = { x: 32, y: 32, r: 18 };
const CORONA = 1.55; // glow reaches this many radii
const ROTATION = 45; // seconds for sunspots to cross the visible face and back round
const TILT = 0.12; // axis tilt toward the viewer (radians)

/** Sunspot groups: latitude, starting longitude, and angular radius (radians) of the penumbra. */
const SPOTS = [
  { lat: 0.32, lon: -0.6, size: 0.17 },
  { lat: 0.26, lon: -0.35, size: 0.09 },
  { lat: -0.28, lon: 0.9, size: 0.14 },
  { lat: -0.22, lon: 2.6, size: 0.12 },
  { lat: 0.18, lon: 3.9, size: 0.1 },
];

// Prominences: a new one every PROM_EVERY seconds, in one of four kinds.
const PROM_EVERY = 6;
const PROM_LIFE = 5;
const PROM_HEIGHT = 9; // typical peak height above the limb, dither px

// Flares: a short bright flash at a sunspot, flinging a spray of particles off the limb.
const FLARE_EVERY = 5.3;
const FLASH_LIFE = 0.7;
const SPRAY_LIFE = 1.6;

// Coronal mass ejections: a rare expanding bubble that drifts out into the open sky on the right.
const CME_FIRST = 12;
const CME_EVERY = 37;
const CME_LIFE = 7;

/** Deterministic 0..1 hash for event k. */
const hash = (k: number, salt: number) => {
  const s = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

/**
 * A distant Sun in 1-bit: a limb-darkened sphere with a crisp rim, boiling granulation, sunspot
 * groups that rotate across the face, a faint corona, and activity on top:
 * - prominences of four kinds: loops, tall arches, loops raining plasma back down their legs,
 *   and eruptive ones that rise, break and drift off;
 * - flares: a sunspot flashes white and a spray of particles shoots off the nearby limb;
 * - now and then a coronal mass ejection: a bubble that balloons out and fades into space.
 */
const paint: DitherPainter = (t, value, solid) => {
  const spin = (t / ROTATION) * TAU;
  const spots = SPOTS.map((s) => {
    const lon = s.lon + spin;
    const c = Math.cos(s.lat);
    // Unit vector on the sphere (x right, y down, z toward the viewer), axis tipped by TILT.
    const y0 = -Math.sin(s.lat);
    const z0 = c * Math.cos(lon);
    return {
      x: c * Math.sin(lon),
      y: y0 * Math.cos(TILT) - z0 * Math.sin(TILT),
      z: y0 * Math.sin(TILT) + z0 * Math.cos(TILT),
      cos: Math.cos(s.size),
      cosUmbra: Math.cos(s.size * 0.45),
    };
  });

  // This flare: which visible spot flashes, how bright, and where its glow and spray head.
  const fi = Math.floor(t / FLARE_EVERY);
  const fs = t - fi * FLARE_EVERY;
  const visible = spots.filter((s) => s.z > 0.25);
  const flareSpot = visible.length ? visible[Math.floor(hash(fi, 5) * visible.length)] : null;
  const flash = flareSpot && fs < FLASH_LIFE ? Math.sin((Math.PI * fs) / FLASH_LIFE) : 0;
  const flareAngle = flareSpot ? Math.atan2(flareSpot.y, flareSpot.x) : 0;
  const flareX = flareSpot ? SUN.x + flareSpot.x * SUN.r : 0;
  const flareY = flareSpot ? SUN.y + flareSpot.y * SUN.r : 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - SUN.x) / SUN.r;
      const dy = (y + 0.5 - SUN.y) / SUN.r;
      const d2 = dx * dx + dy * dy;
      const k = y * W + x;

      if (d2 > 1) {
        // Corona: a thin glow hugging the limb, a little stronger along slowly shifting streamers,
        // and briefly brighter beside a flaring spot.
        const d = Math.sqrt(d2);
        if (d > CORONA) continue;
        const a = Math.atan2(dy, dx);
        const streamers = fbm3(Math.cos(a) * 2.5, Math.sin(a) * 2.5, t * 0.15, 3, 23);
        const near = Math.cos(a - flareAngle);
        const boost = 1 + 2.5 * flash * Math.max(0, near) ** 6;
        value[k] = (0.25 + 0.45 * Math.max(0, streamers - 0.4)) * Math.exp(-(d - 1) / 0.08) * boost;
        continue;
      }

      const mu = Math.sqrt(1 - d2);
      // Limb darkening: full brightness at the centre, fading to just over half at the edge.
      let v = 0.55 + 0.5 * Math.pow(mu, 0.6);
      // Granulation boils quickly; supergranulation drifts slowly underneath it.
      v *= 0.92 + 0.2 * (fbm3(dx * 11, dy * 11, t * 0.45, 2, 11) - 0.5);
      v *= 0.96 + 0.08 * (fbm3(dx * 2.5, dy * 2.5, t * 0.05, 2, 5) - 0.5);
      // The photosphere ends sharply: a solid rim keeps the silhouette round.
      if (d2 > 0.85) v = 1.2;
      for (const s of spots) {
        if (s.z <= 0) continue;
        const dot = dx * s.x + dy * s.y + mu * s.z;
        if (dot > s.cosUmbra) v *= 0.05;
        else if (dot > s.cos) v *= 0.5;
      }
      // Flare: the spot and a ring round it burn solid white for a moment.
      if (flash > 0) {
        const fd = Math.hypot(x + 0.5 - flareX, y + 0.5 - flareY);
        if (fd < 1.5 + 2.5 * flash) v = 2;
      }
      value[k] = v;
      solid[k] = 1;
    }
  }

  // Flare spray: particles shot off the limb above the flaring spot, slowing and fading.
  if (flareSpot && fs < SPRAY_LIFE) {
    const s = fs / SPRAY_LIFE;
    for (let i = 0; i < 7; i++) {
      const a = flareAngle + (hash(fi * 7 + i, 8) - 0.5) * 0.7;
      const reach = (6 + 10 * hash(fi * 7 + i, 9)) * (1 - (1 - s) ** 2);
      const x = Math.floor(SUN.x + Math.cos(a) * (SUN.r + 1 + reach));
      const y = Math.floor(SUN.y + Math.sin(a) * (SUN.r + 1 + reach));
      if (!inBounds(x, y) || solid[y * W + x]) continue;
      value[y * W + x] = Math.max(value[y * W + x], 1.4 * (1 - s));
    }
  }

  // Prominences.
  const newest = Math.floor(t / PROM_EVERY);
  for (let p = newest; p > newest - Math.ceil(PROM_LIFE / PROM_EVERY) - 1; p--) {
    const s = (t - p * PROM_EVERY) / PROM_LIFE;
    if (s < 0 || s > 1) continue;
    const kind = Math.floor(hash(p, 4) * 4); // 0 loop, 1 arch, 2 rain, 3 eruptive
    // Eruptive ones only on the right, where the open sky gives them room to drift away.
    const angle = kind === 3 ? (hash(p, 1) - 0.5) * 1.4 : hash(p, 1) * TAU;
    const spread = kind === 1 ? 0.1 + hash(p, 2) * 0.06 : 0.18 + hash(p, 2) * 0.16;
    const rise = Math.sin(Math.PI * Math.min(1, s * 1.4));
    let height = PROM_HEIGHT * (0.6 + 0.4 * hash(p, 3)) * rise;
    if (kind === 1) height = 13 * rise;
    if (kind === 3) height = PROM_HEIGHT * (0.5 + 3.2 * s);
    const fade = kind === 3 ? 1 - s : s < 0.7 ? 1 : 1 - (s - 0.7) / 0.3;
    const loopAt = (u: number, lift: number) => {
      const phi = angle + (u - 0.5) * 2 * spread;
      const r = SUN.r + height * lift * Math.sin(Math.PI * u);
      return [Math.floor(SUN.x + Math.cos(phi) * r), Math.floor(SUN.y + Math.sin(phi) * r)];
    };
    const plot = ([x, y]: number[], v: number) => {
      if (!inBounds(x, y) || solid[y * W + x]) return;
      value[y * W + x] = Math.max(value[y * W + x], v);
    };

    // Two nested loops: a bright core arc and a fainter outer one. Eruptive loops snap at the
    // legs halfway through and the freed arc keeps rising.
    const legs = kind === 3 && s > 0.45 ? 0.2 : 0;
    for (const [lift, strength] of [[1, 1.1], [1.35, 0.55]]) {
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        if (u < legs || u > 1 - legs) continue;
        plot(loopAt(u, lift), strength * fade);
      }
    }
    // Coronal rain: bright knots condense at the top and slide down both legs.
    if (kind === 2 && s > 0.35) {
      for (let j = 0; j < 3; j++) {
        const f = (s * 2.5 + j / 3) % 1;
        plot(loopAt(0.5 - 0.5 * f, 1), 1.6 * fade);
        plot(loopAt(0.5 + 0.5 * f, 1), 1.6 * fade);
      }
    }
  }

  // Coronal mass ejection: a ragged bubble shell, open toward the Sun, ballooning outward.
  const ci = Math.floor((t - CME_FIRST) / CME_EVERY);
  const cs = (t - CME_FIRST - ci * CME_EVERY) / CME_LIFE;
  if (t >= CME_FIRST && cs <= 1) {
    const a = (hash(ci, 7) - 0.5) * 1.1;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const travel = SUN.r * (1 + 2.4 * cs);
    const radius = SUN.r * (0.35 + 0.85 * cs);
    const bx = SUN.x + ux * travel;
    const by = SUN.y + uy * travel;
    const fade = (1 - cs) ** 1.5;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (solid[k]) continue;
        const px = x + 0.5 - bx;
        const py = y + 0.5 - by;
        const d = Math.hypot(px, py);
        // Only the leading part of the shell; its back stays open toward the Sun.
        if ((px * ux + py * uy) / (d || 1) < -0.35) continue;
        const ragged = fbm3(px * 0.25, py * 0.25, t * 0.4, 2, 61);
        const shell = Math.exp(-(((d - radius) / 1.6) ** 2));
        value[k] = Math.max(value[k], shell * fade * (0.5 + 0.9 * ragged));
      }
    }
  }
};

export default function Sun({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useDitherCanvas(ref, W, H, FPS, paint);
  return <canvas ref={ref} width={W} height={H} aria-hidden="true" className={`block [image-rendering:pixelated] ${className}`} />;
}
