/**
 * The ISS in low orbit, the Moon's orbit, and a recurring Starship mission: launch from Earth's
 * limb, booster separation and boostback to the pad, ship rendezvous with its target, a short
 * stay, then the trip back, reentry and landing at the pad. Missions alternate between the ISS
 * (docking under the central module) and the Moon (landing on its upper limb); the flight is
 * otherwise identical.
 *
 * Everything is a pure function of time. Offsets are relative to Earth's
 * centre in dither pixels (x right, y down, z toward the viewer), scaled by the
 * Earth radius R.
 */

import { TAU } from './dither';

export type Vec3 = { x: number; y: number; z: number };

const ISS_PERIOD = 16; // seconds per orbit
const ISS_ALTITUDE = 1.45; // orbit radius in Earth radii (well above real scale, so the flights have room)
const ISS_INCLINATION = 0.5; // camera elevation above the orbital plane
const ISS_ROLL = 0.28; // tilt of the orbit ellipse on screen

const FIRST_LAUNCH = 6; // seconds after the scene starts
const MISSION_EVERY = 3; // ISS orbits between launches
const ASCENT = 5;
const SEPARATION = 1.7; // seconds into the ascent
const BOOSTBACK = 3.2;
const DOCKED = 4;
const RETURN = 5.5;
const PARKED = 1.2; // how long a landed vehicle stays on the pad
const DOCK_GAP = 4.5; // pixels from the ISS centre down to the docked ship's nose
// ISS phase at the moment of docking: front-left, just off the sunlit limb. The ISS runs
// left-to-right across Earth's face, so the pad (under its earlier position) is on the lit side.
const DOCK_PHASE = Math.PI / 2 + 0.9;

// 24 s per orbit: two mission slots (96 s) are exactly four lunar orbits, so every Moon run finds
// the Moon at the same point. MOON_PHASE puts that point front-left of the Earth, on the sunlit side.
export const MOON_PERIOD = 24; // seconds per orbit
const MOON_PHASE = 2 * Math.PI - 0.14; // orbital angle at t = 0
const MOON_DISTANCE = 2.5; // orbit radius in Earth radii
const MOON_SIZE = 0.27; // Moon radius in Earth radii
// Moon missions set down on the Moon's upper limb on the Earth-facing (shadowed) side, so the
// bright ship stands out against dark ground and sky.
const LANDING_DIR = { x: 0.45, y: -0.89 };

/** A point on a circular orbit of radius `a`, seen from above the plane by `inclination`, rolled on screen. */
export function orbitOffset(theta: number, a: number, inclination: number, roll: number): Vec3 {
  const ox = Math.cos(theta) * a;
  const oz = Math.sin(theta) * a;
  const y1 = oz * Math.sin(inclination);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  return { x: ox * cr - y1 * sr, y: ox * sr + y1 * cr, z: oz * Math.cos(inclination) };
}

/** Phase is pinned so that each mission's docking happens on the visible near side. */
export function issOffset(t: number, R: number): Vec3 {
  const theta = DOCK_PHASE - ((t - FIRST_LAUNCH - ASCENT) / ISS_PERIOD) * TAU;
  return orbitOffset(theta, R * ISS_ALTITUDE, ISS_INCLINATION, ISS_ROLL);
}

export function moonOffset(t: number, R: number): Vec3 {
  return orbitOffset((t / MOON_PERIOD) * TAU + MOON_PHASE, R * MOON_DISTANCE, 0.3, -0.16);
}

/** On-screen Moon radius, a touch larger on the near side of its orbit. */
export function moonRadius(z: number, R: number) {
  return R * MOON_SIZE * (1 + (z / (R * MOON_DISTANCE)) * 0.1);
}

export type Vehicle = {
  kind: 'stack' | 'booster' | 'ship';
  x: number;
  y: number;
  /** Unit vector from the engines toward the nose. */
  dx: number;
  dy: number;
  /** Engine plume behind the vehicle. */
  burning: boolean;
  /** Reentry plasma streaming behind the direction of travel. */
  plasma: boolean;
  /** Depth for occlusion by the Earth and Moon; 0 is the Earth's limb. */
  z: number;
};

/** Body length in dither pixels; the stack is booster + ship. */
export const VEHICLE_LENGTH: Record<Vehicle['kind'], number> = { stack: 8, booster: 5, ship: 3 };

type P = { x: number; y: number };

const smooth = (s: number) => s * s * (3 - 2 * s);

function bezier(a: P, b: P, c: P, u: number): P {
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * b.x + u * u * c.x, y: v * v * a.y + 2 * v * u * b.y + u * u * c.y };
}

function bezierTangent(a: P, b: P, c: P, u: number): P {
  const x = 2 * (1 - u) * (b.x - a.x) + 2 * u * (c.x - b.x);
  const y = 2 * (1 - u) * (b.y - a.y) + 2 * u * (c.y - b.y);
  const m = Math.hypot(x, y) || 1;
  return { x: x / m, y: y / m };
}

const unit = (p: P): P => {
  const m = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / m, y: p.y / m };
};

/** Near the Moon a ship counts as in front of it, so the Moon doesn't clip its tail or plume. */
function frontOfMoon(t: number, p: P, z: number, R: number) {
  const moon = moonOffset(t, R);
  return Math.hypot(p.x - moon.x, p.y - moon.y) < moonRadius(moon.z, R) * 2.5 ? Math.max(z, moon.z + 1) : z;
}

/** Vehicles in flight at time t (empty between missions). */
export function missionAt(t: number, R: number): Vehicle[] {
  const since = t - FIRST_LAUNCH;
  if (since < 0) return [];
  const slot = Math.floor(since / (MISSION_EVERY * ISS_PERIOD));
  const m = since % (MISSION_EVERY * ISS_PERIOD);
  const start = t - m;
  const dockAt = start + ASCENT;
  const undockAt = dockAt + DOCKED;
  if (m > ASCENT + DOCKED + RETURN + PARKED) return [];
  // Every other mission flies to the Moon instead of the ISS.
  const toMoon = slot % 2 === 1;

  // Pad on the limb under where the ISS was a little before docking, so the ascent arcs to catch up.
  // Vehicles are positioned by their nose; on the pad the engines sit on the surface, nose pointing out.
  const n = unit(issOffset(dockAt - 2.4, R));
  const onPad = (kind: Vehicle['kind']) => ({ x: n.x * (R + VEHICLE_LENGTH[kind]), y: n.y * (R + VEHICLE_LENGTH[kind]) });
  const pad = onPad('stack');
  // Docked pose at time `at`: nose-up against the port under the ISS's central module (sprite rows
  // run horizontally), or engines on the Moon's upper limb with the nose pointing straight out.
  const docked = (at: number) => {
    if (!toMoon) {
      const iss = issOffset(at, R);
      return { x: iss.x, y: iss.y + DOCK_GAP, dx: 0, dy: -1, z: 0 };
    }
    const moon = moonOffset(at, R);
    const d = moonRadius(moon.z, R) + VEHICLE_LENGTH.ship;
    return { x: moon.x + LANDING_DIR.x * d, y: moon.y + LANDING_DIR.y * d, dx: LANDING_DIR.x, dy: LANDING_DIR.y, z: moon.z + 1 };
  };
  const dockPoint = docked(dockAt);
  const up = (k: number) => ({ x: n.x * R * (1 + k), y: n.y * R * (1 + k) });
  const ascent = [pad, up(0.9), dockPoint] as const;
  const out: Vehicle[] = [];

  // Booster: rides the stack, separates, flies back down to the pad engines-first.
  const sepU = smooth(SEPARATION / ASCENT);
  const sepPoint = bezier(...ascent, sepU);
  if (m >= SEPARATION && m < SEPARATION + BOOSTBACK + PARKED) {
    const s = Math.min(1, (m - SEPARATION) / BOOSTBACK);
    const back = [sepPoint, up(0.6), onPad('booster')] as const;
    const p = bezier(...back, smooth(s));
    const travel = bezierTangent(...back, Math.max(0.02, smooth(s)));
    // Engines point along the direction of travel, so the nose points back up.
    out.push({ kind: 'booster', ...p, dx: -travel.x, dy: -travel.y, burning: s < 0.2 || (s > 0.75 && s < 1), plasma: false, z: 0 });
  }

  if (m < ASCENT) {
    const u = smooth(m / ASCENT);
    const p = bezier(...ascent, u);
    const dir = bezierTangent(...ascent, u);
    const kind = m < SEPARATION ? 'stack' : 'ship';
    const z = toMoon ? frontOfMoon(t, p, dockPoint.z * u, R) : 0;
    out.push({ kind, ...p, dx: dir.x, dy: dir.y, burning: m < SEPARATION || m / ASCENT < 0.85, plasma: false, z });
  } else if (t < undockAt) {
    out.push({ kind: 'ship', ...docked(t), burning: false, plasma: false });
  } else {
    const s = Math.min(1, (m - ASCENT - DOCKED) / RETURN);
    const from = docked(undockAt);
    const back = [from, up(0.7), onPad('ship')] as const;
    const u = smooth(s);
    const p = bezier(...back, u);
    const travel = bezierTangent(...back, Math.max(0.02, u));
    // Reentry: nose leads through the plasma; landing flip: engines down for the final burn.
    const flipped = s > 0.72;
    out.push({
      kind: 'ship',
      ...p,
      dx: flipped ? -travel.x : travel.x,
      dy: flipped ? -travel.y : travel.y,
      burning: flipped && s < 1,
      plasma: s > 0.15 && s < 0.65,
      z: toMoon ? frontOfMoon(t, p, from.z * (1 - u), R) : 0,
    });
  }
  return out;
}
