/**
 * Shared plumbing for the 1-bit canvas scenes.
 *
 * Scenes shade a continuous intensity per pixel, then threshold it against a
 * static screen-space dither mask, so every pixel is either ink or paper.
 */

export const PAPER = 0xff0b0b0b; // ABGR (little-endian ImageData) for #0b0b0b
export const INK = 0xffe9eff0; // #f0efe9
export const TAU = Math.PI * 2;

export type Layout = 'side' | 'center';

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

export function fbm3(x: number, y: number, z: number, octaves: number, seed: number) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x, y, z, seed + i * 101);
    norm += amp;
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

type Twinkler = { i: number; phase: number; rate: number };

/**
 * Owns the canvas, the 1-bit frame buffer, the dither mask and a starfield.
 * Subclasses place their subject in `setup` and draw it in `render`.
 */
export abstract class DitherScene {
  protected ctx: CanvasRenderingContext2D;
  protected image!: ImageData;
  protected out!: Uint32Array;
  protected buf!: Uint8Array;
  protected bg!: Uint8Array;
  protected mask!: Float32Array;
  protected twinklers: Twinkler[] = [];
  protected w = 0;
  protected h = 0;
  /** Override per scene so stacked panels don't show the same sky. */
  protected starSeed = 1337;

  constructor(protected canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas unsupported');
    this.ctx = ctx;
  }

  /** Size in dither pixels; `side` keeps the left ~44% quiet for text. */
  resize(w: number, h: number, layout: Layout) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.image = this.ctx.createImageData(w, h);
    this.out = new Uint32Array(this.image.data.buffer);
    this.buf = new Uint8Array(w * h);

    // R2 low-discrepancy ordered dither (Roberts): even stipple without Bayer's grid.
    this.mask = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = 0.7548776662 * x + 0.56984029 * y;
        this.mask[y * w + x] = v - Math.floor(v);
      }
    }

    const quietX = layout === 'side' ? w * 0.44 : 0;
    this.buildStars(quietX);
    this.setup(layout, quietX);
  }

  abstract render(t: number, dt: number): void;

  protected abstract setup(layout: Layout, quietX: number): void;

  /** Sparse stars (fewer left of `quietX`), a few plus-shaped, some flagged to twinkle. */
  private buildStars(quietX: number) {
    const { w, h } = this;
    const rand = mulberry32(this.starSeed);
    this.bg = new Uint8Array(w * h);
    this.twinklers = [];
    const count = Math.floor((w * h) / 450);
    for (let s = 0; s < count; s++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      const quiet = x < quietX;
      if (quiet && rand() < 0.6) continue;
      const i = y * w + x;
      this.bg[i] = 1;
      if (!quiet && rand() < 0.03 && x > 1 && y > 1 && x < w - 2 && y < h - 2) {
        this.bg[i - 1] = this.bg[i + 1] = this.bg[i - w] = this.bg[i + w] = 1;
      } else if (rand() < 0.12) {
        this.twinklers.push({ i, phase: rand() * TAU, rate: 0.6 + rand() * 1.8 });
      }
    }

    // Small, distant galaxies; each scene adds one large hero galaxy where its layout has room.
    const unit = Math.min(w, h);
    const left = quietX + w * 0.08;
    for (let g = 0; g < 3; g++) {
      const size = unit * (0.022 + rand() * 0.012);
      this.addGalaxy(left + rand() * (w - left), rand() * h, size, 0.3 + rand() * 0.4, rand() * Math.PI);
    }
    // The text column gets a few sparkles instead: galaxies there compete with the icons.
    if (quietX > 0) {
      for (let s = 0; s < 4; s++) {
        const x = Math.floor(2 + rand() * (quietX - 4));
        const y = Math.floor(2 + rand() * (h - 4));
        const arm = rand() < 0.4 ? 2 : 1;
        for (let d = -arm; d <= arm; d++) {
          this.bg[y * w + x + d] = 1;
          this.bg[(y + d) * w + x] = 1;
        }
      }
    }
  }

  /** A large Andromeda-like spiral with a small elliptical companion off its near side. */
  protected addHeroGalaxy(gx: number, gy: number, size: number, angle: number) {
    this.addGalaxy(gx, gy, size, 0.3, angle);
    this.addGalaxy(gx - Math.sin(angle) * size * 0.6, gy + Math.cos(angle) * size * 0.6, size * 0.18, 0.6, angle + 0.8);
  }

  /**
   * A distant galaxy rendered with the ordered dither: a solid bulge and a disk
   * that fades into stipple. Big enough ones also get spiral structure and dark
   * dust lanes on the near side (the Andromeda look). `size` is the semi-major
   * axis in pixels, `axis` the apparent minor/major ratio from inclination.
   */
  private addGalaxy(gx: number, gy: number, size: number, axis: number, angle: number) {
    const { w, h, bg, mask } = this;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const detailed = size >= 24;
    const reach = Math.ceil(size * 1.2);
    // Twinkling stars under the galaxy would blink holes into it.
    this.twinklers = this.twinklers.filter(({ i }) => {
      const dx = (i % w) - gx;
      const dy = Math.floor(i / w) - gy;
      return Math.hypot((dx * ca + dy * sa) / size, (-dx * sa + dy * ca) / (size * axis)) > 1.15;
    });
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = Math.round(gx + dx);
        const y = Math.round(gy + dy);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const u = (dx * ca + dy * sa) / size;
        const v = (-dx * sa + dy * ca) / size;
        const r = Math.hypot(u, v / axis);
        if (r > 1.15) continue;
        const bulge = 1.6 * Math.exp(-((r / 0.14) ** 2)) + 0.5 * Math.exp(-r / 0.18);
        let disk = 1.05 * Math.exp(-r / 0.42) * Math.min(1, (1.15 - r) / 0.35);
        if (detailed) {
          disk *= 0.85 + 0.3 * Math.cos(2 * (Math.atan2(v / axis, u) - 3 * Math.log(r + 0.05)));
          const nearSide = v > 0 ? 1 : 0.3;
          for (const lane of [0.4, 0.62]) disk *= 1 - 0.9 * nearSide * Math.exp(-(((r - lane) / 0.045) ** 2));
        }
        const k = y * w + x;
        const on = bulge + disk > mask[k];
        // Inside the bright body the galaxy replaces the sky, so foreground stars don't clutter it.
        if (r < 0.85) bg[k] = on ? 1 : 0;
        else if (on) bg[k] = 1;
      }
    }
  }

  protected twinkle(t: number) {
    for (const s of this.twinklers) {
      if (Math.sin(t * s.rate + s.phase) > 0.55) this.buf[s.i] = 0;
    }
  }

  protected present() {
    const { buf, out } = this;
    for (let i = 0; i < buf.length; i++) out[i] = buf[i] ? INK : PAPER;
    this.ctx.putImageData(this.image, 0, 0);
  }
}
