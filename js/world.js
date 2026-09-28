// Voxel storage and deterministic world generation. Pure module (no DOM, no three).
import { B } from './blocks.js';
import { mulberry32 } from './textures.js';

export const WX = 224;
export const WY = 48;
export const WZ = 64;
export const CHUNK = 16;
export const G = 20;

export function createWorld() {
  const blocks = new Uint8Array(WX * WY * WZ);
  const inBounds = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < WX && y < WY && z < WZ;
  return {
    blocks,
    inBounds,
    get(x, y, z) {
      if (y >= WY) return B.AIR;
      if (!inBounds(x, y, z)) return B.BEDROCK;
      return blocks[(y * WZ + z) * WX + x];
    },
    set(x, y, z, id) {
      if (inBounds(x, y, z)) blocks[(y * WZ + z) * WX + x] = id;
    },
  };
}

export function terrainHeight(x, z) {
  const d = z < 22 ? 22 - z : z > 50 ? z - 50 : 0;
  if (d === 0) return G;
  return Math.min(WY - 10, G + Math.round(d * 0.45 + 1.5 * Math.sin(x * 0.11) + 1.5 * Math.cos(z * 0.23)));
}

export function generateWorld(stops, projects, profile) {
  const world = createWorld();
  const interact = new Map();
  const labels = [];
  const banners = [];
  const boards = [];
  const beacons = [];
  const zones = [];
  const buildings = [];
  const set = world.set;

  const box = (x0, x1, y0, y1, z0, z1, id) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, id);
  };
  // Hollow walls on the rectangle perimeter with LOG corner columns.
  const walls = (x0, x1, z0, z1, y0, y1, id) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { set(x, y, z0, id); set(x, y, z1, id); }
      for (let z = z0; z <= z1; z++) { set(x0, y, z, id); set(x1, y, z, id); }
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) set(x, y, z, B.LOG);
    }
  };
  const mark = (x, y, z, entry) => interact.set(`${x},${y},${z}`, entry);

  // Terrain.
  for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
    const h = terrainHeight(x, z);
    set(x, 0, z, B.BEDROCK);
    for (let y = 1; y <= h - 4; y++) set(x, y, z, B.STONE);
    for (let y = Math.max(1, h - 3); y <= h - 1; y++) set(x, y, z, B.DIRT);
    set(x, h, z, B.GRASS);
  }

  // Path.
  box(2, 221, G, G, 30, 33, B.GRAVEL);

  // Trees.
  const rng = mulberry32(20260);
  const trees = [];
  for (let attempt = 0; attempt < 400 && trees.length < 40; attempt++) {
    const x = 2 + Math.floor(rng() * (WX - 4));
    const z = rng() < 0.5 ? 4 + Math.floor(rng() * 17) : 52 + Math.floor(rng() * 9);
    if (trees.some((t) => Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) <= 3)) continue;
    const trunk = 4 + Math.floor(rng() * 2);
    trees.push({ x, z });
    const base = terrainHeight(x, z) + 1;
    const top = base + trunk - 1;
    for (let y = base; y <= top; y++) set(x, y, z, B.LOG);
    const leaf = (lx, ly, lz) => { if (world.get(lx, ly, lz) === B.AIR) set(lx, ly, lz, B.LEAVES); };
    for (const [ly, r] of [[top - 1, 2], [top, 2], [top + 1, 1], [top + 2, 1]]) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        leaf(x + dx, ly, z + dz);
      }
    }
  }

  // Spawn plaza.
  zones.push({ x0: 0, x1: 24, label: 'SPAWN' });
  box(6, 14, G + 1, G + 4, 26, 26, B.PLANKS);
  box(5, 5, G + 1, G + 5, 26, 26, B.LOG);
  box(15, 15, G + 1, G + 5, 26, 26, B.LOG);
  boards.push({
    x: 10.5, y: G + 3, z: 27.02, w: 9, h: 4,
    lines: [
      profile.name, profile.title, '',
      'WASD move · SPACE jump · SHIFT sprint · MOUSE look',
      'LEFT-CLICK break · RIGHT-CLICK use / place · 1–9 blocks',
      'R respawn · F3 debug',
      'Walk right along the path →',
    ],
  });
  const spawn = { x: 10.5, y: G + 1, z: 31.5, yaw: 0, pitch: 0 };

  // Career stops.
  stops.forEach((stop, i) => {
    const x0 = 24 + 26 * i;
    const W = B.WALL0 + i;
    const H = stop.kind === 'education' ? 7 : 9;
    zones.push({ x0, x1: x0 + 26, label: stop.org });
    buildings.push({ stopIndex: i, x0, H });

    box(x0 + 1, x0 + 11, G, G, 37, 45, B.PLANKS);
    walls(x0, x0 + 12, 36, 46, G + 1, G + H, W);
    box(x0, x0 + 12, G + H + 1, G + H + 1, 36, 46, W);
    set(x0 + 6, G + 1, 36, B.AIR);
    set(x0 + 6, G + 2, 36, B.AIR);
    const rows = H === 9 ? [G + 3, G + 4, G + 6, G + 7] : [G + 3, G + 4];
    for (const y of rows) {
      for (const x of [x0 + 2, x0 + 3, x0 + 9, x0 + 10]) set(x, y, 36, B.GLASS);
      for (const z of [39, 40, 42, 43]) { set(x0, y, z, B.GLASS); set(x0 + 12, y, z, B.GLASS); }
    }
    banners.push({ x: x0 + 6.5, y: G + 5, z: 35.98, w: 3, h: 3, stopIndex: i });

    const entry = { kind: 'stop', index: i, label: stop.org };
    set(x0 + 4, G + 1, 34, B.SIGN);
    mark(x0 + 4, G + 1, 34, entry);
    set(x0 + 6, G + 1, 45, B.CRAFTING);
    mark(x0 + 6, G + 1, 45, entry);
    labels.push({
      x: x0 + 4.5, y: G + 2.9, z: 34.5,
      lines: [stop.org.toUpperCase(), stop.dates, ...(stop.current ? ['★ NOW'] : [])],
    });

    if (i === 0) {
      // Clock tower.
      box(x0 + 5, x0 + 7, G + H + 2, G + H + 7, 40, 42, W);
      set(x0 + 6, G + H + 8, 41, B.GOLD);
      const cy = G + H + 5;
      set(x0 + 6, cy, 40, B.WHITE); set(x0 + 6, cy, 42, B.WHITE);
      set(x0 + 5, cy, 41, B.WHITE); set(x0 + 7, cy, 41, B.WHITE);
    } else if (i === 1) {
      // Oil derrick.
      for (const x of [x0 + 16, x0 + 18]) for (const z of [40, 42]) box(x, x, G + 1, G + 8, z, z, B.IRON);
      for (const y of [G + 4, G + 8]) {
        for (let x = x0 + 16; x <= x0 + 18; x++) for (let z = 40; z <= 42; z++) {
          if (x === x0 + 17 && z === 41) continue;
          set(x, y, z, B.IRON);
        }
      }
      box(x0 + 17, x0 + 17, G + 9, G + 11, 41, 41, B.IRON);
      box(x0 + 20, x0 + 21, G, G, 44, 45, B.BLACK);
    } else if (i === 2) {
      // Car.
      for (const x of [x0 + 16, x0 + 21]) for (const z of [40, 42]) set(x, G + 1, z, B.BLACK);
      box(x0 + 16, x0 + 21, G + 2, G + 2, 40, 42, B.IRON);
      box(x0 + 17, x0 + 19, G + 3, G + 3, 40, 42, B.GLASS);
      box(x0 + 17, x0 + 19, G + 4, G + 4, 40, 42, B.IRON);
      set(x0 + 21, G + 2, 40, B.GOLD);
      set(x0 + 21, G + 2, 42, B.GOLD);
    } else if (i === 3) {
      // Shopping bag.
      box(x0 + 16, x0 + 21, G + 1, G + 7, 40, 43, W);
      for (const [x, y] of [[17, 8], [17, 9], [18, 10], [19, 10], [20, 9], [20, 8]]) set(x0 + x, G + y, 41, B.WHITE);
    } else if (i === 4) {
      // Chip.
      box(x0 + 15, x0 + 23, G + 1, G + 1, 38, 46, B.BLACK);
      box(x0 + 17, x0 + 21, G + 2, G + 2, 40, 44, B.IRON);
      for (const z of [39, 41, 43, 45]) { set(x0 + 14, G, z, B.GOLD); set(x0 + 24, G, z, B.GOLD); }
      for (const x of [16, 18, 20, 22]) { set(x0 + x, G, 37, B.GOLD); set(x0 + x, G, 47, B.GOLD); }
    }

    if (stop.current) {
      set(x0 + 6, G + H + 1, 41, B.GLASS);
      beacons.push({ x: x0 + 6.5, y0: G + H + 2, z: 41.5 });
    }
  });

  // Project village.
  zones.push({ x0: 154, x1: 200, label: 'PROJECT VILLAGE' });
  labels.push({ x: 156.5, y: G + 4, z: 35, lines: ['PROJECT VILLAGE'], big: true });
  projects.forEach((project, k) => {
    const cx = 158 + 7 * k;
    box(cx - 1, cx + 1, G, G, 35, 37, B.PLANKS);
    set(cx, G + 1, 36, B.CHEST);
    mark(cx, G + 1, 36, { kind: 'project', index: k, label: project.title });
    labels.push({ x: cx + 0.5, y: G + 2.8, z: 36.5, lines: [project.title, String(project.year)] });
  });

  // Home.
  zones.push({ x0: 200, x1: 224, label: 'HOME' });
  box(205, 211, G, G, 37, 43, B.PLANKS);
  walls(204, 212, 36, 44, G + 1, G + 4, B.PLANKS);
  box(204, 212, G + 5, G + 5, 36, 44, B.BRICKS);
  set(208, G + 1, 36, B.AIR);
  set(208, G + 2, 36, B.AIR);
  for (const [x, z] of [[206, 36], [210, 36], [204, 40], [212, 40]]) set(x, G + 2, z, B.GLASS);
  for (const x of [208, 209]) {
    set(x, G + 1, 42, B.BED);
    mark(x, G + 1, 42, { kind: 'goal', index: 0, label: 'Contact' });
  }
  labels.push({ x: 208.5, y: G + 7, z: 40, lines: ['HOME · CONTACT'], big: true });

  return { world, interact, labels, banners, boards, beacons, zones, spawn, buildings };
}
