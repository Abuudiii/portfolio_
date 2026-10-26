/**
 * Tiny animated 1-bit icons, drawn procedurally on a 16x16 grid.
 * Each sprite paints one frame into a `Pen`; `PixelIcon` cycles the frames.
 */

export const SPRITE_SIZE = 16;

export class Pen {
  readonly data = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE);

  px(x: number, y: number, on = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) this.data[y * SPRITE_SIZE + x] = on;
  }

  rect(x: number, y: number, w: number, h: number, on = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, on);
  }

  outline(x: number, y: number, w: number, h: number) {
    this.rect(x, y, w, 1);
    this.rect(x, y + h - 1, w, 1);
    this.rect(x, y, 1, h);
    this.rect(x + w - 1, y, 1, h);
  }

  line(x0: number, y0: number, x1: number, y1: number, on = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) this.px(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, on);
  }

  /** Filled ellipse (circle when ry is omitted), sampled at pixel centres. */
  disc(cx: number, cy: number, rx: number, ry = rx, on = 1) {
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const u = (x - cx) / rx;
        const v = (y - cy) / ry;
        if (u * u + v * v <= 1) this.px(x, y, on);
      }
    }
  }

  /** One-pixel ellipse outline: the filled shape minus its 4-neighbour interior. */
  ring(cx: number, cy: number, rx: number, ry = rx) {
    const inside = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        if (inside(x, y) && !(inside(x + 1, y) && inside(x - 1, y) && inside(x, y + 1) && inside(x, y - 1))) {
          this.px(x, y);
        }
      }
    }
  }

  /** Clear every pixel whose four neighbours are all on, leaving one-pixel outlines. */
  hollow() {
    const src = this.data.slice();
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE && src[y * SPRITE_SIZE + x];
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        if (on(x, y) && on(x + 1, y) && on(x - 1, y) && on(x, y + 1) && on(x, y - 1)) this.data[y * SPRITE_SIZE + x] = 0;
      }
    }
  }
}

export type Sprite = {
  frames: number;
  fps: number;
  draw: (pen: Pen, frame: number) => void;
};

/** AMD: a graphics card whose two fans spin. */
const gpu: Sprite = {
  frames: 4,
  fps: 10,
  draw(p, f) {
    p.outline(0, 4, 16, 9);
    p.rect(0, 2, 2, 2); // bracket tab
    for (let x = 3; x < 13; x += 2) p.px(x, 13); // PCIe fingers
    for (const cx of [4.5, 11]) {
      p.ring(cx, 8, 3);
      const a = (f / 4) * Math.PI * 0.5;
      for (const b of [a, a + Math.PI / 2]) {
        p.line(cx - Math.cos(b) * 2, 8 - Math.sin(b) * 2, cx + Math.cos(b) * 2, 8 + Math.sin(b) * 2);
      }
    }
  },
};

/** Dominion Dynamics: a ground rover with a blinking sensor mast, crawling through falling snow. */
const rover: Sprite = {
  frames: 8,
  fps: 6,
  draw(p, f) {
    for (const [sx, s] of [[2, 0], [6, 5], [10, 2], [14, 6], [4, 3]]) p.px(sx, (s + f) % 8);
    p.rect(3, 8, 10, 3);
    p.rect(5, 7, 5, 1);
    p.line(11, 7, 11, 4);
    p.px(11, 3, f % 4 < 2 ? 1 : 0);
    p.px(12, 3, f % 4 < 2 ? 1 : 0);
    for (const wx of [4, 8, 12]) {
      p.disc(wx, 12, 1.5);
      p.px(wx, 12, 0);
    }
    for (let x = 0; x < 16; x++) if ((x + f) % 3 !== 0) p.px(x, 15);
  },
};

/** Shopify: a shopping bag with a heartbeat blip running across it. */
const bag: Sprite = {
  frames: 18,
  fps: 10,
  draw(p, f) {
    // ECG-style blip that slides in from the left wall, exits through the right, then the line
    // stays flat for a beat before the next one. k is the blip's left edge (-4..13).
    const k = f - 4;
    for (let x = 3; x < 13; x++) if (x < k || x > k + 3) p.px(x, 10);
    p.line(k, 10, k + 1, 7);
    p.line(k + 1, 7, k + 2, 12);
    p.line(k + 2, 12, k + 3, 10);
    // Clip the blip to the bag's interior, then draw the bag on top.
    p.rect(0, 6, 3, 8, 0);
    p.rect(13, 6, 3, 8, 0);
    p.outline(2, 5, 12, 10);
    p.line(5, 5, 5, 3);
    p.line(6, 2, 9, 2);
    p.line(10, 3, 10, 5);
  },
};

/** BlackBerry QNX: a microcontroller whose pins fire interrupts in turn. */
const chip: Sprite = {
  frames: 12,
  fps: 8,
  draw(p, f) {
    p.outline(4, 4, 8, 8);
    p.px(6, 6);
    const pins: [number, number, number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const o = 5 + i * 2;
      pins.push([o, 3, 0, -1], [12, o, 1, 0], [o + 1, 12, 0, 1], [3, o + 1, -1, 0]);
    }
    pins.forEach(([x, y, dx, dy], i) => {
      p.px(x, y);
      p.px(x + dx, y + dy);
      // The active pin's signal travels outward.
      if (i === f % pins.length) {
        p.px(x + dx * 2, y + dy * 2);
        p.px(x + dx * 3, y + dy * 3);
      }
    });
  },
};

/** Enverus: a cloud linked to three hosts, with packets dropping down the links. */
const network: Sprite = {
  frames: 6,
  fps: 8,
  draw(p, f) {
    p.disc(5, 5.5, 2.6);
    p.disc(9, 4, 3.2);
    p.disc(12.5, 6, 2.2);
    p.rect(3, 6, 11, 2);
    p.hollow();
    for (const [i, x] of [3, 8, 13].entries()) {
      for (let y = 9; y < 13; y += 2) p.px(x, y);
      p.rect(x - 1, 13, 3, 2);
      const step = (f + i * 2) % 6;
      if (step < 4) p.px(x, 9 + step);
    }
  },
};

/** NeuroNorth: a small network of neurons passing a spike from cell to cell. */
const neurons: Sprite = {
  frames: 20,
  fps: 10,
  draw(p, f) {
    const cells: [number, number][] = [[3, 3], [12, 2], [8, 8], [2, 12], [13, 12]];
    const links: [number, number][] = [[0, 2], [1, 2], [2, 3], [2, 4], [3, 4]];
    // Dendrite stubs give the cells their spiky look.
    for (const [x, y, dx, dy] of [[3, 3, -2, -2], [12, 2, 2, -1], [2, 12, -1, 2], [13, 12, 2, 2], [8, 8, 2, -3]]) {
      p.line(x, y, x + dx, y + dy);
    }
    for (const [a, b] of links) p.line(cells[a][0], cells[a][1], cells[b][0], cells[b][1]);
    // One spike at a time travels along a link (4 frames per link), lighting the cell it reaches.
    const link = Math.floor(f / 4) % links.length;
    const t = (f % 4) / 4;
    const [a, b] = links[link];
    const sx = cells[a][0] + (cells[b][0] - cells[a][0]) * t;
    const sy = cells[a][1] + (cells[b][1] - cells[a][1]) * t;
    cells.forEach(([x, y], i) => {
      const firing = i === b && f % 4 === 3;
      p.disc(x, y, firing ? 2.2 : 1.5);
      if (!firing) p.px(x, y, 0);
    });
    p.disc(sx, sy, 1.1);
  },
};

/** Exoplanets: a TESS-like space telescope hovering, watching a planet transit a star. */
const telescope: Sprite = {
  frames: 16,
  fps: 6,
  draw(p, f) {
    // Star, top right, with a one-pixel planet crossing its face.
    p.disc(13, 2.5, 2.2);
    p.px(11 + Math.floor(f / 3), 2, 0);
    // Satellite: body, open aperture on top, solar panels on struts. Bobs by a pixel.
    const y = 7 + (f % 8 < 4 ? 0 : 1);
    p.rect(6, y, 4, 6);
    p.rect(5, y - 1, 6, 1);
    p.rect(7, y - 1, 2, 1, 0);
    p.px(7, y);
    p.px(8, y, 0);
    p.rect(1, y + 2, 3, 3);
    p.px(2, y + 3, 0);
    p.line(4, y + 3, 5, y + 3);
    p.rect(12, y + 2, 3, 3);
    p.px(13, y + 3, 0);
    p.line(10, y + 3, 11, y + 3);
  },
};

/**
 * QWOP agent: a stick-figure runner striding over a scrolling track, a reward sparkle popping
 * above its head once per stride (the RL loop: act, move forward, get rewarded).
 */
const runner: Sprite = {
  frames: 8,
  fps: 8,
  draw(p, f) {
    const phase = (f / 8) * Math.PI * 2;
    const bob = Math.abs(Math.sin(phase)) < 0.5 ? 0 : 1;
    const hipX = 7;
    const hipY = 9 + bob;
    // Head, torso leaning forward, and two arms swinging opposite the legs.
    p.disc(9, 2.5 + bob, 1.4);
    p.line(hipX, hipY, 9, 4 + bob);
    for (const side of [1, -1]) {
      const arm = Math.sin(phase) * side;
      p.line(8, 5 + bob, 8 + arm * 3 + side * 0.6, 7 + bob + Math.abs(arm));
      // Legs: thigh swings wide, calf trails and kicks back on the recovery stroke.
      const thigh = Math.PI / 2 - 0.15 + Math.sin(phase) * side * 0.75;
      const kneeX = hipX + Math.cos(thigh) * 3;
      const kneeY = hipY + Math.sin(thigh) * 3;
      const calf = thigh + 0.15 + Math.max(0, -Math.cos(phase) * side) * 1.1;
      p.line(hipX, hipY, kneeX, kneeY);
      p.line(kneeX, kneeY, kneeX + Math.cos(calf) * 3, Math.min(14, kneeY + Math.sin(calf) * 3));
    }
    // Track markings scroll backwards: the agent is making progress.
    p.rect(0, 15, 16, 1);
    for (let x = 0; x < 16; x++) if ((x + f * 2) % 6 === 0) p.px(x, 14);
    // Reward: a small plus sparkle flashes up and to the right each stride.
    if (f < 3) {
      const y = 4 - f;
      p.px(14, y);
      p.px(13, y + 1);
      p.px(15, y + 1);
      p.px(14, y + 2);
    }
  },
};

export const sprites = { gpu, rover, bag, chip, network, neurons, telescope, runner } satisfies Record<string, Sprite>;
export type SpriteName = keyof typeof sprites;
