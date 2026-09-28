// First-person player physics and voxel raycasting. Pure module (no DOM, no three).
import { B } from './blocks.js';
import { WX, WZ } from './world.js';

export const GRAVITY = 32;
export const JUMP_V = 9;
export const WALK = 4.3;
export const SPRINT = 5.6;
export const MAX_FALL = 50;
export const STEP = 1 / 120;
export const REACH = 6;
export const EYE = 1.62;
export const HALF_W = 0.3;
export const HEIGHT = 1.8;
export const EPS = 1e-6;

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, z: spawn.z, vx: 0, vy: 0, vz: 0,
    yaw: spawn.yaw, pitch: spawn.pitch, onGround: false,
  };
}

// Hitbox is [min, max); voxel range is floor(min)..floor(max - EPS).
function box(p) {
  return [
    Math.floor(p.x - HALF_W), Math.floor(p.x + HALF_W - EPS),
    Math.floor(p.y), Math.floor(p.y + HEIGHT - EPS),
    Math.floor(p.z - HALF_W), Math.floor(p.z + HALF_W - EPS),
  ];
}

// Returns the extreme solid coordinate along `axis` (min when moving +, max when moving -), or null.
function collide(p, world, axis, dir) {
  const [x0, x1, y0, y1, z0, z1] = box(p);
  let hit = null;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (world.get(x, y, z) === B.AIR) continue;
    const c = axis === 0 ? x : axis === 1 ? y : z;
    if (hit === null || (dir > 0 ? c < hit : c > hit)) hit = c;
  }
  return hit;
}

export function stepPlayer(p, input, world, dt) {
  // 1. Wish direction.
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = input.f * -sy + input.s * cy;
  let wz = input.f * -cy + input.s * -sy;
  const len = Math.hypot(wx, wz);
  if (len > 1) { wx /= len; wz /= len; }
  const speed = input.sprint ? SPRINT : WALK;
  wx *= speed; wz *= speed;

  // 2. Blend horizontal velocity.
  const k = Math.min(1, dt * (p.onGround ? 12 : 4));
  p.vx += (wx - p.vx) * k;
  p.vz += (wz - p.vz) * k;

  // 3. Jump; 4. gravity.
  if (input.jump && p.onGround) p.vy = JUMP_V;
  p.vy = Math.max(p.vy - GRAVITY * dt, -MAX_FALL);

  // 5. Per-axis move and resolve: X, Z, Y.
  if (p.vx !== 0) {
    p.x += p.vx * dt;
    const hit = collide(p, world, 0, p.vx);
    if (hit !== null) { p.x = p.vx > 0 ? hit - HALF_W : hit + 1 + HALF_W; p.vx = 0; }
  }
  if (p.vz !== 0) {
    p.z += p.vz * dt;
    const hit = collide(p, world, 2, p.vz);
    if (hit !== null) { p.z = p.vz > 0 ? hit - HALF_W : hit + 1 + HALF_W; p.vz = 0; }
  }
  p.onGround = false;
  if (p.vy !== 0) {
    p.y += p.vy * dt;
    const hit = collide(p, world, 1, p.vy);
    if (hit !== null) {
      if (p.vy > 0) p.y = hit - HEIGHT;
      else { p.y = hit + 1; p.onGround = true; }
      p.vy = 0;
    }
  }

  // 6. Clamp to the world footprint.
  p.x = Math.min(Math.max(p.x, HALF_W), WX - HALF_W);
  p.z = Math.min(Math.max(p.z, HALF_W), WZ - HALF_W);
}

export function viewDir(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

// Amanatides–Woo voxel traversal. Returns the first non-AIR voxel and the entered face normal.
export function raycast(world, ox, oy, oz, dx, dy, dz, maxDist = REACH) {
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return null;
  dx /= len; dy /= len; dz /= len;
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = sx ? Math.abs(1 / dx) : Infinity;
  const tdy = sy ? Math.abs(1 / dy) : Infinity;
  const tdz = sz ? Math.abs(1 / dz) : Infinity;
  let tmx = sx > 0 ? (x + 1 - ox) * tdx : sx < 0 ? (ox - x) * tdx : Infinity;
  let tmy = sy > 0 ? (y + 1 - oy) * tdy : sy < 0 ? (oy - y) * tdy : Infinity;
  let tmz = sz > 0 ? (z + 1 - oz) * tdz : sz < 0 ? (oz - z) * tdz : Infinity;
  let nx = 0, ny = 0, nz = 0, dist = 0;
  while (dist <= maxDist) {
    if (world.get(x, y, z) !== B.AIR) return { x, y, z, nx, ny, nz, dist };
    if (tmx < tmy && tmx < tmz) {
      x += sx; dist = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0;
    } else if (tmy < tmz) {
      y += sy; dist = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0;
    } else {
      z += sz; dist = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz;
    }
  }
  return null;
}

export function blockIntersectsPlayer(p, bx, by, bz) {
  return bx < p.x + HALF_W - EPS && bx + 1 > p.x - HALF_W + EPS &&
    by < p.y + HEIGHT - EPS && by + 1 > p.y + EPS &&
    bz < p.z + HALF_W - EPS && bz + 1 > p.z - HALF_W + EPS;
}
