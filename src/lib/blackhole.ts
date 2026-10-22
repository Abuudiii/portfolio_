/**
 * 1-bit dithered black hole with a thin accretion disk.
 *
 * Geometry is static, so light paths are ray-traced once per resize: near the
 * hole each pixel's ray is integrated through Schwarzschild bending, and
 * further out the weak-field deflection (2 Rs / b) is applied analytically.
 * Each frame only spins the disk texture and re-dithers the disk pixels.
 *
 * Units inside the tracer: Schwarzschild radius Rs = 1.
 */

import { DitherScene, TAU, fbm3, type Layout } from './dither';

const DISK_IN = 2.6;
const DISK_OUT = 9.5;
const TILT = 0.16; // camera elevation above the disk plane (radians)
const ROLL = -0.2; // on-screen tilt of the disk
const TRACE_B = 12; // impact parameter below which rays are integrated
const TRACE_BLEND = 1.5; // width (Rs) of the band where traced lensing eases into the analytic one
const SOURCE_DIST = 20; // hole-to-starfield distance; Einstein ring radius = sqrt(2 * SOURCE_DIST)
const CAMERA_Z = 20;
const SPIN = 2.4; // Keplerian angular speed scale: omega = SPIN * r^-1.5 rad/s
const SKY_DRIFT = 4; // background drift past the hole, in dither pixels per second
const TEX_R = 96;
const TEX_PHI = 512;

const COS_ROLL = Math.cos(ROLL);
const SIN_ROLL = Math.sin(ROLL);
// Disk normal (up and slightly toward the camera; screen y points down) and in-plane basis.
const N = [0, -Math.cos(TILT), Math.sin(TILT)] as const;
const E1 = [1, 0, 0] as const;
const E2 = [N[1] * E1[2] - N[2] * E1[1], N[2] * E1[0] - N[0] * E1[2], N[0] * E1[1] - N[1] * E1[0]] as const;

/** Streaky disk albedo indexed by (radius bin, azimuth bin): features stretch along the orbit. */
function buildDiskTexture() {
  const tex = new Float32Array(TEX_R * TEX_PHI);
  for (let i = 0; i < TEX_R; i++) {
    const r = DISK_IN + ((i + 0.5) / TEX_R) * (DISK_OUT - DISK_IN);
    for (let j = 0; j < TEX_PHI; j++) {
      const phi = (j / TEX_PHI) * TAU;
      const n = fbm3(r * 2.6, Math.cos(phi) * 2.2, Math.sin(phi) * 2.2, 4, 17);
      tex[i * TEX_PHI + j] = 0.12 + Math.min(1, Math.max(0, (n - 0.36) * 3.2)) * 0.95;
    }
  }
  return tex;
}

type Hit = { kind: 'disk'; r: number; phi: number; weight: number } | { kind: 'horizon' } | { kind: 'sky'; sx: number; sy: number };

/** Integrate one camera ray (orthographic, heading -z) offset (u, v) from the hole. */
function trace(u: number, v: number): Hit {
  let x = u;
  let y = v;
  let z = CAMERA_Z;
  let vx = 0;
  let vy = 0;
  let vz = -1;
  const h2 = u * u + v * v; // |x cross v|^2, conserved
  let side = x * N[0] + y * N[1] + z * N[2];
  for (let step = 0; step < 4000; step++) {
    const r = Math.sqrt(x * x + y * y + z * z);
    if (r < 1) return { kind: 'horizon' };
    if (r > CAMERA_Z + 2 && x * vx + y * vy + z * vz > 0) break;
    const dt = Math.min(1.5, Math.max(0.02, 0.08 * r));
    // Photon geodesic in Schwarzschild, written as a Newtonian-looking force: a = -1.5 h^2 x / r^5.
    const k = (-1.5 * h2) / (r * r * r * r * r);
    vx += k * x * dt;
    vy += k * y * dt;
    vz += k * z * dt;
    const nx = x + vx * dt;
    const ny = y + vy * dt;
    const nz = z + vz * dt;
    const nextSide = nx * N[0] + ny * N[1] + nz * N[2];
    if ((side > 0) !== (nextSide > 0)) {
      const f = side / (side - nextSide);
      const px = x + (nx - x) * f;
      const py = y + (ny - y) * f;
      const pz = z + (nz - z) * f;
      const pr = Math.sqrt(px * px + py * py + pz * pz);
      if (pr >= DISK_IN && pr <= DISK_OUT) {
        const phi = Math.atan2(px * E2[0] + py * E2[1] + pz * E2[2], px * E1[0] + py * E1[1] + pz * E1[2]);
        // Orbital velocity direction N x p_hat; the emitted photon travels opposite the traced ray.
        const ox = (N[1] * pz - N[2] * py) / pr;
        const oy = (N[2] * px - N[0] * pz) / pr;
        const oz = (N[0] * py - N[1] * px) / pr;
        const speed = Math.hypot(vx, vy, vz);
        const toward = -(ox * vx + oy * vy + oz * vz) / speed;
        const beta = Math.sqrt(0.5 / pr);
        const doppler = 1 / (Math.sqrt(1 - beta * beta) * (1 - beta * toward));
        const redshift = Math.sqrt(1 - 1 / pr);
        const inner = Math.min(1, (pr - DISK_IN) / 0.35);
        const outer = Math.min(1, (DISK_OUT - pr) / 2.5);
        const profile = Math.pow(DISK_IN / pr, 1.1) * inner * outer;
        const weight = Math.min(1.5, profile * redshift * Math.pow(doppler, 1.6) * 1.2);
        return { kind: 'disk', r: pr, phi, weight };
      }
    }
    x = nx;
    y = ny;
    z = nz;
    side = nextSide;
  }
  // Escaped: carry the bent ray on to the starfield plane behind the hole.
  const speed = Math.hypot(vx, vy, vz);
  const dz = vz / speed;
  if (dz > -0.05) return { kind: 'sky', sx: x * 40, sy: y * 40 };
  const t = (-SOURCE_DIST - z) / dz;
  return { kind: 'sky', sx: x + (vx / speed) * t, sy: y + (vy / speed) * t };
}

export class BlackHoleScene extends DitherScene {
  protected starSeed = 2026;
  private tex = buildDiskTexture();
  /**
   * Source-sky point each screen pixel sees through the lens. `srcY` stays unrounded so the drift
   * carries pixels across source rows at different moments (arcs stream instead of stepping);
   * it is -1 for the horizon and disk.
   */
  private srcX = new Uint16Array(0);
  private srcY = new Float32Array(0);
  /** Source sky for the current frame (stars with twinkle applied), resampled into `buf`. */
  private sky = new Uint8Array(0);
  private diskIdx = new Int32Array(0);
  private diskRow = new Uint16Array(0);
  private diskPhi = new Float32Array(0);
  private diskOmega = new Float32Array(0);
  private diskWeight = new Float32Array(0);

  /**
   * Ray-trace the lens once: for every screen pixel, which point of the background sky it sees
   * (or the disk / horizon). `bg` stays the unlensed source sky; each frame drifts it slowly
   * upward and looks it up through this map, so stars stream past and bend into arcs live.
   */
  protected setup(layout: Layout, quietX: number) {
    const { w, h } = this;
    const side = layout === 'side';
    const cx = w * (side ? 0.71 : 0.5);
    const cy = h * (side ? 0.5 : 0.52);
    const rs = side ? Math.min(h * 0.046, w * 0.027) : Math.min(w * 0.035, h * 0.05);

    const srcX = new Uint16Array(w * h);
    const srcY = new Float32Array(w * h);
    const idx: number[] = [];
    const row: number[] = [];
    const phis: number[] = [];
    const omega: number[] = [];
    const weight: number[] = [];

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const k = py * w + px;
        // The text column sees the sky unlensed, keeping it calm behind the copy.
        if (px < quietX) {
          srcX[k] = px;
          srcY[k] = py + 0.5;
          continue;
        }
        // Screen offset -> hole-plane coordinates (undo the roll, scale to Rs).
        const dx = (px + 0.5 - cx) / rs;
        const dy = (py + 0.5 - cy) / rs;
        const u = dx * COS_ROLL + dy * SIN_ROLL;
        const v = -dx * SIN_ROLL + dy * COS_ROLL;
        const b2 = u * u + v * v;
        // Weak field: source = image * (1 - 2 L / b^2).
        const s = 1 - (2 * SOURCE_DIST) / b2;
        let su = u * s;
        let sv = v * s;
        if (b2 < TRACE_B * TRACE_B) {
          const hit = trace(u, v);
          if (hit.kind === 'horizon') {
            srcY[k] = -1;
            continue;
          }
          if (hit.kind === 'disk') {
            srcY[k] = -1;
            idx.push(k);
            row.push(Math.min(TEX_R - 1, Math.floor(((hit.r - DISK_IN) / (DISK_OUT - DISK_IN)) * TEX_R)));
            phis.push(hit.phi);
            omega.push(SPIN * Math.pow(hit.r, -1.5));
            weight.push(hit.weight);
            continue;
          }
          // The traced and analytic answers differ by a few pixels at TRACE_B; ease from one to
          // the other over the last TRACE_BLEND Rs so the switch leaves no ring-shaped seam.
          const f = Math.min(1, Math.max(0, (TRACE_B - Math.sqrt(b2)) / TRACE_BLEND));
          const g = f * f * (3 - 2 * f);
          su += (hit.sx - su) * g;
          sv += (hit.sy - sv) * g;
        }
        // Lensing eases to zero over the band just right of the text column, so the unlensed
        // column joins the lensed sky without a seam.
        const e = Math.min(1, Math.max(0, (px - quietX) / (w * 0.15)));
        const fade = e * e * (3 - 2 * e);
        su = u + (su - u) * fade;
        sv = v + (sv - v) * fade;
        // Hole-plane source -> screen pixel (redo the roll). Off-screen sources wrap around,
        // so the sky never runs out of stars.
        const sx = cx + (su * COS_ROLL - sv * SIN_ROLL) * rs;
        const sy = cy + (su * SIN_ROLL + sv * COS_ROLL) * rs;
        srcX[k] = ((Math.round(sx) % w) + w) % w;
        srcY[k] = (((sy + 0.5) % h) + h) % h;
      }
    }

    this.srcX = srcX;
    this.srcY = srcY;
    this.sky = new Uint8Array(w * h);
    this.diskIdx = Int32Array.from(idx);
    this.diskRow = Uint16Array.from(row);
    this.diskPhi = Float32Array.from(phis);
    this.diskOmega = Float32Array.from(omega);
    this.diskWeight = Float32Array.from(weight);
  }

  render(t: number) {
    const { w, h, buf, mask, sky, srcX, srcY, tex, diskIdx, diskRow, diskPhi, diskOmega, diskWeight } = this;
    // Twinkle in the source sky, so a star's lensed images all blink together.
    sky.set(this.bg);
    for (const s of this.twinklers) if (Math.sin(t * s.rate + s.phase) > 0.55) sky[s.i] = 0;
    // The background drifts slowly upward relative to the hole.
    const drift = (t * SKY_DRIFT) % h;
    for (let k = 0; k < buf.length; k++) {
      const sy = srcY[k];
      if (sy < 0) {
        buf[k] = 0;
        continue;
      }
      let y = Math.floor(sy + drift);
      if (y >= h) y -= h;
      buf[k] = sky[y * w + srcX[k]];
    }
    for (let i = 0; i < diskIdx.length; i++) {
      let a = (diskPhi[i] - diskOmega[i] * t) / TAU;
      a -= Math.floor(a);
      const value = tex[diskRow[i] * TEX_PHI + Math.floor(a * TEX_PHI)] * diskWeight[i];
      const k = diskIdx[i];
      buf[k] = value > mask[k] ? 1 : 0;
    }
    this.present();
  }
}
