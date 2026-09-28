// Procedural 16x16 RGBA block tiles. Pure module (no DOM, no three).
import { BLOCKS } from './blocks.js';

export const TILE_PX = 16;
const N = TILE_PX;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit string hash.
export function hashString(str) {
  let h = 0x811C9DC5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Small painter over one tile's pixel buffer.
function canvas(src) {
  const d = src ? new Uint8ClampedArray(src) : new Uint8ClampedArray(N * N * 4);
  const put = (x, y, rgb, a = 255) => {
    const i = (y * N + x) * 4;
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a;
  };
  const mul = (x, y, k) => {
    const i = (y * N + x) * 4;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  };
  return { d, put, mul };
}

const jit = (rng, rgb, p) => {
  const k = 1 + (rng() * 2 - 1) * p;
  return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
};

function fill(c, rng, hex, p) {
  const rgb = hexToRgb(hex);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.put(x, y, jit(rng, rgb, p));
}

const DARK_WOOD = hexToRgb('#3C2410');

function bevelled(hex) {
  return (c, rng) => {
    fill(c, rng, hex, 0.04);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (y === N - 1 || x === N - 1) c.mul(x, y, 0.8);
      else if (y === 0 || x === 0) c.mul(x, y, 1.15);
    }
  };
}

function chest(c, rng, midLine) {
  fill(c, rng, '#A0692A', 0.06);
  for (let i = 0; i < N; i++) {
    c.put(i, 0, DARK_WOOD); c.put(i, N - 1, DARK_WOOD);
    c.put(0, i, DARK_WOOD); c.put(N - 1, i, DARK_WOOD);
    if (midLine) c.put(i, 6, DARK_WOOD);
  }
}

const pick = (rng, hexes) => {
  const list = hexes.map(hexToRgb);
  return (c) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.put(x, y, list[Math.floor(rng() * list.length)]);
  };
};

// Recipes: (c, rng, tiles) where `tiles` holds already-built tiles for derived recipes.
const RECIPES = {
  grass_top: (c, rng) => fill(c, rng, '#5B9A32', 0.12),
  dirt: (c, rng) => {
    const alt = hexToRgb('#6B4A32');
    fill(c, rng, '#866043', 0.12);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (rng() < 0.1) c.put(x, y, alt);
  },
  grass_side: (c, rng) => {
    const g = hexToRgb('#5B9A32');
    for (let y = 0; y < 3; y++) for (let x = 0; x < N; x++) c.put(x, y, jit(rng, g, 0.1));
    for (let x = 0; x < N; x++) if (rng() < 0.5) c.put(x, 3, jit(rng, g, 0.1));
  },
  stone: (c, rng) => {
    const alt = hexToRgb('#6A6A6A');
    fill(c, rng, '#7D7D7D', 0.08);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (rng() < 0.15) c.put(x, y, alt);
  },
  cobble: (c, rng) => {
    const mortar = hexToRgb('#4E4E4E');
    fill(c, rng, '#7A7A7A', 0.15);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (y % 4 === 3 || x % 5 === (y >> 2) % 5) c.put(x, y, mortar);
    }
  },
  planks: (c, rng) => {
    const seam = hexToRgb('#6F5530');
    fill(c, rng, '#A5834E', 0.06);
    for (let y = 0; y < N; y++) {
      if (y % 4 === 3) for (let x = 0; x < N; x++) c.put(x, y, seam);
      else c.put(((y >> 2) * 5 + 3) % 16, y, seam);
    }
  },
  log_side: (c, rng) => {
    fill(c, rng, '#6B5131', 0.08);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x += 3) c.mul(x, y, 0.8);
  },
  log_top: (c) => {
    const a = hexToRgb('#B08D57'), b = hexToRgb('#8E6F42'), bark = hexToRgb('#6B5131');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
      const d = Math.hypot(x - 7.5, y - 7.5);
      c.put(x, y, edge ? bark : Math.floor(d) % 2 === 0 ? a : b);
    }
  },
  leaves: (c, rng) => {
    const g = hexToRgb('#3E8A1F');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const rgb = jit(rng, g, 0.2);
      c.put(x, y, rgb, rng() < 0.18 ? 0 : 255);
    }
  },
  glass: (c) => {
    const frame = hexToRgb('#DDEFF5'), white = [255, 255, 255];
    for (let i = 0; i < N; i++) {
      c.put(i, 0, frame); c.put(i, N - 1, frame); c.put(0, i, frame); c.put(N - 1, i, frame);
    }
    for (const g of [3, 4, 5]) c.put(g, g, white);
  },
  bricks: (c, rng) => {
    const mortar = hexToRgb('#BFB7AA');
    fill(c, rng, '#9B4F3D', 0.08);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (y % 4 === 3 || x % 8 === ((y >> 2) % 2 ? 3 : 7)) c.put(x, y, mortar);
    }
  },
  gravel: (c, rng) => pick(rng, ['#8A8480', '#6F6966', '#A39C98', '#5A5552'])(c),
  bedrock: (c, rng) => pick(rng, ['#555555', '#333333', '#777777'])(c),
  iron: bevelled('#D8D8D8'),
  gold: bevelled('#F5D342'),
  black: bevelled('#1E1E1E'),
  white: bevelled('#EAEAEA'),
  chest_top: (c, rng) => chest(c, rng, false),
  chest_side: (c, rng) => chest(c, rng, true),
  chest_front: (c) => {
    const latch = hexToRgb('#C0C0C0');
    for (let y = 5; y <= 7; y++) for (let x = 7; x <= 8; x++) c.put(x, y, latch);
  },
  crafting_top: (c) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (y % 5 === 0 || x % 5 === 0) c.put(x, y, DARK_WOOD);
    }
  },
  crafting_side: (c) => {
    for (let y = 3; y <= 9; y++) for (let x = 2; x <= 5; x++) c.put(x, y, DARK_WOOD);
    for (let y = 3; y <= 5; y++) for (let x = 10; x <= 13; x++) c.put(x, y, DARK_WOOD);
  },
  sign: (c, rng) => {
    fill(c, rng, '#B8945F', 0.05);
    for (const y of [4, 7, 10]) {
      const end = 2 + 6 + Math.floor(rng() * 7);
      for (let x = 2; x < end; x++) c.put(x, y, DARK_WOOD);
    }
  },
  bed_top: (c, rng) => {
    const red = hexToRgb('#B02E26'), sheet = hexToRgb('#E8E8E8');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.put(x, y, y < 10 ? jit(rng, red, 0.05) : sheet);
  },
  bed_side: (c) => {
    const red = hexToRgb('#B02E26');
    for (let y = 0; y < 6; y++) for (let x = 0; x < N; x++) c.put(x, y, red);
  },
  stone_brick: (c, rng) => {
    const mortar = hexToRgb('#555555');
    fill(c, rng, '#7A7A7A', 0.06);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (y % 8 === 7 || x === (y < 8 ? 7 : 3) || x === (y < 8 ? 15 : 11)) c.put(x, y, mortar);
    }
  },
};

// Derived tiles start from a copy of another tile's pixels.
const BASE = {
  grass_side: 'dirt', chest_front: 'chest_side', crafting_top: 'planks',
  crafting_side: 'planks', bed_side: 'planks',
};

function wallRecipe(hex) {
  return (c, rng) => {
    fill(c, rng, hex, 0.05);
    for (let i = 0; i < N; i++) {
      c.mul(i, N - 1, 0.85);
      if (i < N - 1) c.mul(N - 1, i, 0.85);
    }
  };
}

// Atlas order: every tile referenced by BLOCKS (block order, top/bottom/side/front),
// which ends with wall0..wall4.
export function tileNames() {
  const names = [];
  for (const def of BLOCKS) {
    if (!def.tiles) continue;
    for (const key of ['top', 'bottom', 'side', 'front']) {
      const t = def.tiles[key];
      if (t && !names.includes(t)) names.push(t);
    }
  }
  return names;
}

export function buildTiles(stops) {
  const names = tileNames();
  const data = new Map();
  const build = (name) => {
    if (data.has(name)) return data.get(name);
    const wall = /^wall(\d)$/.exec(name);
    const recipe = wall ? wallRecipe(stops[Number(wall[1])].color) : RECIPES[name];
    if (!recipe) throw new Error(`no texture recipe for ${name}`);
    const c = canvas(BASE[name] ? build(BASE[name]) : null);
    recipe(c, mulberry32(hashString(name)));
    data.set(name, c.d);
    return c.d;
  };
  for (const name of names) build(name);
  return { names, data };
}
