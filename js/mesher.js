// Chunk mesh builder: culled faces, per-vertex AO, atlas UVs. Pure module (no DOM, no three).
import { B, BLOCKS, isOpaque } from './blocks.js';
import { WY, CHUNK } from './world.js';

const AO_LEVEL = [0.5, 0.65, 0.8, 1.0];

// Corners are bottom-left, bottom-right, top-right, top-left as seen from outside (CCW).
const FACES = [
  { n: [1, 0, 0], shade: 0.8, tile: 'side', c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], shade: 0.8, tile: 'side', c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], shade: 1.0, tile: 'top', c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], shade: 0.5, tile: 'bottom', c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], shade: 0.6, tile: 'side', c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], shade: 0.6, tile: 'front', c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

// For each face corner: the two in-plane offsets pointing away from the face centre.
for (const f of FACES) {
  const axis = f.n.findIndex((v) => v !== 0);
  f.ao = f.c.map((corner) => {
    const d = corner.map((v, i) => (i === axis ? 0 : v ? 1 : -1));
    const [a, b] = [0, 1, 2].filter((i) => i !== axis);
    const s1 = [0, 0, 0], s2 = [0, 0, 0];
    s1[a] = d[a]; s2[b] = d[b];
    return [s1, s2];
  });
}

function emits(a, b) {
  if (b === B.AIR) return true;
  if (a === B.LEAVES && b === B.LEAVES) return true;
  return BLOCKS[b].transparent && b !== a;
}

export function buildChunkMesh(world, cx, cz, tileIndex, atlasCols, atlasRows) {
  const positions = [], uvs = [], colors = [], indices = [];
  const opaque = (x, y, z) => (isOpaque(world.get(x, y, z)) ? 1 : 0);
  const x0 = cx * CHUNK, z0 = cz * CHUNK;

  for (let y = 0; y < WY; y++) for (let z = z0; z < z0 + CHUNK; z++) for (let x = x0; x < x0 + CHUNK; x++) {
    const a = world.get(x, y, z);
    if (a === B.AIR) continue;
    const tiles = BLOCKS[a].tiles;
    for (const f of FACES) {
      const [nx, ny, nz] = f.n;
      if (!emits(a, world.get(x + nx, y + ny, z + nz))) continue;

      const name = f.tile === 'front' ? (tiles.front ?? tiles.side) : tiles[f.tile];
      const idx = tileIndex.get(name);
      const col = idx % atlasCols, row = Math.floor(idx / atlasCols);
      const u0 = col / atlasCols + 0.001, u1 = (col + 1) / atlasCols - 0.001;
      const v1 = 1 - row / atlasRows - 0.001, v0 = 1 - (row + 1) / atlasRows + 0.001;

      const ox = x + nx, oy = y + ny, oz = z + nz;
      const ao = [0, 0, 0, 0];
      const base = positions.length / 3;
      for (let i = 0; i < 4; i++) {
        const [s1, s2] = f.ao[i];
        const side1 = opaque(ox + s1[0], oy + s1[1], oz + s1[2]);
        const side2 = opaque(ox + s2[0], oy + s2[1], oz + s2[2]);
        const corner = opaque(ox + s1[0] + s2[0], oy + s1[1] + s2[1], oz + s1[2] + s2[2]);
        ao[i] = side1 && side2 ? 0 : 3 - (side1 + side2 + corner);
        const c = f.c[i];
        positions.push(x + c[0], y + c[1], z + c[2]);
        uvs.push(i === 0 || i === 3 ? u0 : u1, i < 2 ? v0 : v1);
        const shade = f.shade * AO_LEVEL[ao[i]];
        colors.push(shade, shade, shade);
      }
      if (ao[0] + ao[2] < ao[1] + ao[3]) {
        indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      } else {
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}
