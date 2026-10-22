/**
 * The ISS in low orbit, plus a recurring Starship mission: launch from Earth's
 * limb, booster separation and boostback to the pad, ship rendezvous and
 * docking with the ISS, then undock, reentry and landing at the pad.
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

/** Vehicles in flight at time t (empty between missions). */
export function missionAt(t: number, R: number): Vehicle[] {
  const since = t - FIRST_LAUNCH;
  if (since < 0) return [];
  const m = since % (MISSION_EVERY * ISS_PERIOD);
  const start = t - m;
  const dockAt = start + ASCENT;
  const undockAt = dockAt + DOCKED;
  if (m > ASCENT + DOCKED + RETURN + PARKED) return [];

  // Pad on the limb under where the ISS was a little before docking, so the ascent arcs to catch up.
  // Vehicles are positioned by their nose; on the pad the engines sit on the surface, nose pointing out.
  const n = unit(issOffset(dockAt - 2.4, R));
  const onPad = (kind: Vehicle['kind']) => ({ x: n.x * (R + VEHICLE_LENGTH[kind]), y: n.y * (R + VEHICLE_LENGTH[kind]) });
  const pad = onPad('stack');
  // Docked pose: nose-up against the port under the central module (sprite rows run horizontally).
  const docked = (iss: Vec3) => ({ x: iss.x, y: iss.y + DOCK_GAP, dx: 0, dy: -1 });
  const dockPoint = docked(issOffset(dockAt, R));
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
    out.push({ kind: 'booster', ...p, dx: -travel.x, dy: -travel.y, burning: s < 0.2 || (s > 0.75 && s < 1), plasma: false });
  }

  if (m < ASCENT) {
    const u = smooth(m / ASCENT);
    const p = bezier(...ascent, u);
    const dir = bezierTangent(...ascent, u);
    const kind = m < SEPARATION ? 'stack' : 'ship';
    out.push({ kind, ...p, dx: dir.x, dy: dir.y, burning: m < SEPARATION || m / ASCENT < 0.85, plasma: false });
  } else if (t < undockAt) {
    out.push({ kind: 'ship', ...docked(issOffset(t, R)), burning: false, plasma: false });
  } else {
    const s = Math.min(1, (m - ASCENT - DOCKED) / RETURN);
    const from = docked(issOffset(undockAt, R));
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
    });
  }
  return out;
}
