/** 1-bit dithered Earth + Moon, orbiting. */

import { DitherScene, TAU, fbm3, mulberry32, type Layout } from './dither';

const MOON_PERIOD = 26; // seconds per orbit
const DAY_PERIOD = 60; // seconds per Earth rotation
const AXIAL_TILT = 0.41; // radians (~23.4 deg)
const ORBIT_INCLINATION = 0.3; // camera elevation above the orbital plane
const ORBIT_ROLL = -0.16; // tilt of the orbit ellipse on screen

// Light from the left and slightly above, mostly side-on so the terminator reads clearly.
const L = normalize([-0.86, -0.34, 0.38]);

function normalize(v: [number, number, number]): [number, number, number] {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

function percentile(values: Float32Array, p: number) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.floor(sorted.length * p)];
}

type Texture = { w: number; h: number; data: Float32Array };

/** Equirectangular albedo map sampled once; per-frame shading is a lookup. */
function buildTexture(
  w: number,
  h: number,
  shade: (px: number, py: number, pz: number, lat: number) => number,
): Texture {
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const lat = (j / (h - 1) - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const lon = (i / w) * TAU;
      data[j * w + i] = shade(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat);
    }
  }
  return { w, h, data };
}

function buildEarth(): Texture {
  const w = 512;
  const h = 256;
  const height = buildTexture(w, h, (x, y, z) => fbm3(x * 1.15 + 9, y * 1.15, z * 1.15, 4, 7));
  const clouds = buildTexture(w, h, (x, y, z) => fbm3(x * 2.2, y * 5 + 3, z * 2.2, 4, 31));
  const sea = percentile(height.data, 0.64);
  const sky = percentile(clouds.data, 0.86);
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const lat = Math.abs((j / (h - 1) - 0.5) * Math.PI);
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const hgt = height.data[k];
      let a = hgt > sea ? 0.92 : 0.15;
      if (clouds.data[k] > sky) a = Math.max(a, 0.66);
      if (lat > 1.22) a = 1;
      data[k] = a;
    }
  }
  return { w, h, data };
}

function buildMoon(): Texture {
  const tex = buildTexture(256, 128, (x, y, z) => fbm3(x * 1.4 + 2, y * 1.4, z * 1.4, 5, 91));
  const maria = percentile(tex.data, 0.3);
  const rand = mulberry32(5);
  const craters = Array.from({ length: 26 }, () => {
    const lon = rand() * TAU;
    const lat = Math.asin(rand() * 2 - 1);
    const r = 0.05 + rand() * 0.14;
    return { x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon), r };
  });
  for (let j = 0; j < tex.h; j++) {
    const lat = (j / (tex.h - 1) - 0.5) * Math.PI;
    for (let i = 0; i < tex.w; i++) {
      const lon = (i / tex.w) * TAU;
      const px = Math.cos(lat) * Math.cos(lon);
      const py = Math.sin(lat);
      const pz = Math.cos(lat) * Math.sin(lon);
      const k = j * tex.w + i;
      const n = tex.data[k];
      let a = n < maria ? 0.42 : 0.78 + (n - 0.5) * 0.4;
      for (const c of craters) {
        const d = Math.hypot(px - c.x, py - c.y, pz - c.z) / c.r;
        if (d < 0.8) a *= 0.72;
        else if (d < 1) a = Math.min(1, a + 0.18);
      }
      tex.data[k] = a;
    }
  }
  return tex;
}

type Meteor = { x: number; y: number; vx: number; vy: number; life: number; age: number };

export class OrbitScene extends DitherScene {
  private meteor: Meteor | null = null;
  private nextMeteor = 4;
  private earth = buildEarth();
  private moon = buildMoon();
  private cx = 0;
  private cy = 0;
  private R = 0;

  /** `side`: Earth on the right of the text column. `center`: Earth fills the box. */
  protected setup(layout: Layout, quietX: number) {
    const { w, h } = this;
    const side = layout === 'side';
    this.cx = w * (side ? 0.71 : 0.5);
    this.cy = h * (side ? 0.48 : 0.52);
    this.R = side ? Math.min(h * 0.2, w * 0.11) : Math.min(w * 0.15, h * 0.2);
    this.addNebula(quietX);
    // Andromeda-like galaxy in the corner opposite the nebula, clear of the Earth and orbit.
    const unit = Math.min(w, h);
    if (side) this.addHeroGalaxy(w * 0.89, h * 0.8, unit * 0.12, -0.45);
    else this.addHeroGalaxy(w * 0.18, h * 0.13, unit * 0.1, -0.4);
  }

  /** Stippled nebula band running diagonally from the top edge, just above-right of the Earth. */
  private addNebula(quietX: number) {
    const { w, h, cx, cy, bg } = this;
    const rand = mulberry32(4242);
    const ax = cx - w * 0.2;
    const ay = 0;
    const bx = w;
    const by = cy * 0.75;
    const len = Math.hypot(bx - ax, by - ay);
    const span = Math.min(w, h) * 0.12;
    for (let y = 0; y < h; y++) {
      for (let x = Math.ceil(quietX); x < w; x++) {
        const d = ((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / len;
        const falloff = Math.exp(-(d * d) / (2 * span * span));
        const cloud = fbm3(x * 0.02, y * 0.02, 0.5, 4, 3);
        const edge = Math.min(1, (x - quietX) / (w * 0.1));
        if (rand() < falloff * edge * Math.max(0, cloud - 0.42) * 0.36) bg[y * w + x] = 1;
      }
    }
  }

  private moonPosition(t: number) {
    const theta = (t / MOON_PERIOD) * TAU + 2.2;
    const a = this.R * 2.5;
    const ox = Math.cos(theta) * a;
    const oz = Math.sin(theta) * a;
    const y1 = oz * Math.sin(ORBIT_INCLINATION);
    const z1 = oz * Math.cos(ORBIT_INCLINATION);
    const cr = Math.cos(ORBIT_ROLL);
    const sr = Math.sin(ORBIT_ROLL);
    return { x: ox * cr - y1 * sr, y: ox * sr + y1 * cr, z: z1 };
  }

  private drawOrbitPath() {
    const { w, h, buf, cx, cy, R } = this;
    const steps = Math.floor(R * 16);
    for (let s = 0; s < steps; s += 5) {
      const p = this.moonPosition((s / steps) * MOON_PERIOD);
      const x = Math.round(cx + p.x);
      const y = Math.round(cy + p.y);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (p.z < 0 && Math.hypot(p.x, p.y) < R + 3) continue;
      buf[y * w + x] = 1;
    }
  }

  /** Is the ray from point p toward the light blocked by a sphere? */
  private static occluded(px: number, py: number, pz: number, sx: number, sy: number, sz: number, sr: number) {
    const ox = px - sx;
    const oy = py - sy;
    const oz = pz - sz;
    const b = ox * L[0] + oy * L[1] + oz * L[2];
    const c = ox * ox + oy * oy + oz * oz - sr * sr;
    return b < 0 && b * b - c > 0;
  }

  private drawSphere(
    sx: number,
    sy: number,
    sz: number,
    r: number,
    tex: Texture,
    spin: number,
    tilt: number,
    shadow: { x: number; y: number; z: number; r: number },
    outline: boolean,
  ) {
    const { w, h, buf, mask } = this;
    const pad = outline ? 2 : 0;
    const x0 = Math.max(0, Math.floor(sx - r - pad));
    const x1 = Math.min(w - 1, Math.ceil(sx + r + pad));
    const y0 = Math.max(0, Math.floor(sy - r - pad));
    const y1 = Math.min(h - 1, Math.ceil(sy + r + pad));
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const r2 = r * r;
    const ro2 = (r + pad) * (r + pad);
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - sy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - sx;
        const d2 = dx * dx + dy * dy;
        const k = y * w + x;
        if (d2 > r2) {
          if (d2 <= ro2) buf[k] = 0;
          continue;
        }
        const nx = dx / r;
        const ny = dy / r;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let lit = nx * L[0] + ny * L[1] + nz * L[2];
        if (lit <= 0) {
          buf[k] = 0;
          continue;
        }
        if (OrbitScene.occluded(sx + nx * r, sy + ny * r, sz + nz * r, shadow.x, shadow.y, shadow.z, shadow.r)) {
          buf[k] = 0;
          continue;
        }
        // Undo axial tilt (rotation about the view axis), then spin about the pole.
        const tx = nx * ct + ny * st;
        const ty = -nx * st + ny * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, ty)));
        let u = (Math.atan2(nz, tx) + spin) / TAU;
        u -= Math.floor(u);
        const v = lat / Math.PI + 0.5;
        const ti = Math.min(tex.h - 1, Math.floor(v * tex.h)) * tex.w + Math.floor(u * tex.w);
        lit = Math.min(1, lit * 1.25);
        const intensity = tex.data[ti] * Math.pow(lit, 0.7);
        buf[k] = intensity > mask[k] ? 1 : 0;
      }
    }
  }

  private drawAtmosphere() {
    const { w, h, buf, mask, cx, cy, R } = this;
    const halo = Math.max(3, R * 0.09);
    const outer = R + halo;
    const x0 = Math.max(0, Math.floor(cx - outer));
    const x1 = Math.min(w - 1, Math.ceil(cx + outer));
    const y0 = Math.max(0, Math.floor(cy - outer));
    const y1 = Math.min(h - 1, Math.ceil(cy + outer));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const d = Math.hypot(dx, dy);
        if (d <= R || d > outer) continue;
        const facing = Math.max(0, (dx / d) * L[0] + (dy / d) * L[1]);
        const fall = 1 - (d - R) / halo;
        const k = y * w + x;
        if (fall * fall * (0.15 + facing) * 0.55 > mask[k]) buf[k] = 1;
      }
    }
  }

  private drawMeteor(t: number, dt: number) {
    const { w, h, buf } = this;
    if (!this.meteor) {
      if (t < this.nextMeteor) return;
      const rand = Math.random;
      const dir = rand() < 0.5 ? -1 : 1;
      const speed = w * (0.45 + rand() * 0.3);
      this.meteor = {
        x: dir < 0 ? w * (0.5 + rand() * 0.5) : w * rand() * 0.5,
        y: h * rand() * 0.35,
        vx: dir * speed,
        vy: speed * (0.25 + rand() * 0.2),
        life: 0.7 + rand() * 0.5,
        age: 0,
      };
      this.nextMeteor = t + 6 + rand() * 9;
    }
    const m = this.meteor;
    m.age += dt;
    if (m.age > m.life) {
      this.meteor = null;
      return;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const speed = Math.hypot(m.vx, m.vy);
    const ux = m.vx / speed;
    const uy = m.vy / speed;
    const fade = Math.sin((m.age / m.life) * Math.PI);
    const tail = Math.floor(28 * fade) + 2;
    for (let i = 0; i < tail; i++) {
      if (i > 3 && (i & 1) === 1 && i > tail * 0.4) continue;
      const x = Math.round(m.x - ux * i);
      const y = Math.round(m.y - uy * i);
      if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = 1;
    }
  }

  render(t: number, dt: number) {
    const { cx, cy, R } = this;
    this.buf.set(this.bg);
    this.twinkle(t);
    this.drawMeteor(t, dt);
    this.drawOrbitPath();

    const mp = this.moonPosition(t);
    const depth = 1 + (mp.z / (R * 2.5)) * 0.1;
    const moon = { x: cx + mp.x, y: cy + mp.y, z: mp.z, r: R * 0.27 * depth };
    const earth = { x: cx, y: cy, z: 0, r: R };
    const spin = (t / DAY_PERIOD) * TAU;
    const moonSpin = (t / MOON_PERIOD) * TAU; // tidally locked

    // Painter's order: whichever body is farther goes first; the nearer one gets a paper outline.
    const moonBehind = mp.z < 0;
    if (moonBehind) this.drawSphere(moon.x, moon.y, moon.z, moon.r, this.moon, moonSpin, 0.1, earth, false);
    this.drawAtmosphere();
    this.drawSphere(cx, cy, 0, R, this.earth, spin, AXIAL_TILT, moon, moonBehind);
    if (!moonBehind) this.drawSphere(moon.x, moon.y, moon.z, moon.r, this.moon, moonSpin, 0.1, earth, true);

    this.present();
  }
}
