import { T, TILE } from './level.js';

export const GRAVITY = 900;
export const JUMP_V = -330;
export const JUMP_CUT = 0.5;
export const RUN_MAX = 110;
export const ACCEL = 700;
export const FRICTION = 900;
export const MAX_FALL = 400;
export const COYOTE = 0.08;
export const JUMP_BUFFER = 0.1;
export const ENEMY_SPEED = 30;
export const STOMP_BOUNCE = -200;
export const KNOCK_VX = 150;
export const KNOCK_VY = -150;
export const INVULN = 0.6;
export const STEP = 1 / 120;

export function tileAt(level, tx, ty) {
  if (tx < 0 || tx >= level.w || ty >= level.h) return T.GROUND;
  if (ty < 0) return T.EMPTY;
  return level.tiles[ty * level.w + tx];
}

export function isSolid(level, tx, ty) {
  return tileAt(level, tx, ty) !== T.EMPTY;
}

export function createPlayer(x, y) {
  return {
    x,
    y,
    w: 12,
    h: 15,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    coyote: 0,
    jumpBuf: 0,
    invuln: 0,
    anim: 0,
    locked: false,
    cut: false,
  };
}

// Hitboxes cover [x, x+w) × [y, y+h); EPS keeps an exact edge out of the next tile.
const EPS = 1e-6;
const cols = (p) => [Math.floor(p.x / TILE), Math.floor((p.x + p.w - EPS) / TILE)];
const rows = (p) => [Math.floor(p.y / TILE), Math.floor((p.y + p.h - EPS) / TILE)];

function solidInColumn(level, tx, ty0, ty1) {
  for (let ty = ty0; ty <= ty1; ty++) if (isSolid(level, tx, ty)) return true;
  return false;
}

export function stepPlayer(p, input, level, dt) {
  const events = [];

  // 1. Horizontal acceleration / friction
  const d = p.locked ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (d) {
    p.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, p.vx + d * ACCEL * dt));
    p.facing = d;
  } else {
    const f = FRICTION * dt;
    p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
  }

  // 2. Timers
  p.coyote = p.onGround ? COYOTE : p.coyote - dt;
  p.jumpBuf = !p.locked && input.jumpPressed ? JUMP_BUFFER : p.jumpBuf - dt;

  // 3. Jump + variable height
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = JUMP_V;
    p.jumpBuf = 0;
    p.coyote = 0;
    p.onGround = false;
    p.cut = false;
    events.push({ type: 'jump' });
  }
  if (!input.jump && p.vy < -100 && !p.cut) {
    p.vy *= JUMP_CUT;
    p.cut = true;
  }

  // 4. Gravity
  p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);

  // 5. X axis
  p.x += p.vx * dt;
  {
    const [ty0, ty1] = rows(p);
    const [tx0, tx1] = cols(p);
    if (p.vx > 0 && solidInColumn(level, tx1, ty0, ty1)) {
      p.x = tx1 * TILE - p.w;
      p.vx = 0;
    } else if (p.vx < 0 && solidInColumn(level, tx0, ty0, ty1)) {
      p.x = (tx0 + 1) * TILE;
      p.vx = 0;
    }
    p.x = Math.max(0, Math.min(level.w * TILE - p.w, p.x));
  }

  // 6. Y axis
  p.y += p.vy * dt;
  const [tx0, tx1] = cols(p);
  const [ty0, ty1] = rows(p);
  p.onGround = false;
  if (p.vy >= 0) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (isSolid(level, tx, ty1)) {
        p.y = ty1 * TILE - p.h;
        p.vy = 0;
        p.onGround = true;
        break;
      }
    }
  } else {
    const cx = Math.floor((p.x + p.w / 2) / TILE);
    let hit = -1;
    if (isSolid(level, cx, ty0)) hit = cx;
    else for (let tx = tx0; tx <= tx1; tx++) if (isSolid(level, tx, ty0)) hit = tx;
    if (hit >= 0) {
      p.y = (ty0 + 1) * TILE;
      p.vy = 0;
      const tile = tileAt(level, hit, ty0);
      if (tile === T.QBLOCK) {
        level.tiles[ty0 * level.w + hit] = T.USED;
        events.push({ type: 'hit', tx: hit, ty: ty0, first: true });
      } else if (tile === T.USED) {
        events.push({ type: 'hit', tx: hit, ty: ty0, first: false });
      } else if (tile === T.BRICK) {
        events.push({ type: 'bump', tx: hit, ty: ty0 });
      }
    }
  }

  // 7. Timers
  p.invuln = Math.max(0, p.invuln - dt);
  p.anim += (dt * Math.abs(p.vx)) / RUN_MAX;
  return events;
}

export function stepEnemy(e, level, dt) {
  if (e.dead) return;
  if (e.vx == null) e.vx = -ENEMY_SPEED;
  e.x += e.vx * dt;
  const footTy = Math.floor((e.y + TILE - 1) / TILE);
  if (e.vx < 0) {
    const ahead = Math.floor(e.x / TILE);
    if (e.x <= e.minX || isSolid(level, ahead, footTy)) {
      e.x = Math.max(e.minX, isSolid(level, ahead, footTy) ? (ahead + 1) * TILE : e.x);
      e.vx = ENEMY_SPEED;
    }
  } else {
    const ahead = Math.floor((e.x + TILE) / TILE);
    if (e.x >= e.maxX || isSolid(level, ahead, footTy)) {
      e.x = Math.min(e.maxX, isSolid(level, ahead, footTy) ? ahead * TILE - TILE : e.x);
      e.vx = -ENEMY_SPEED;
    }
  }
  e.anim = (e.anim || 0) + dt;
}

export function resolveEnemyContact(p, e) {
  if (e.dead) return null;
  const ex = e.x + 1;
  const ey = e.y + 2;
  if (p.x >= ex + 14 || p.x + p.w <= ex || p.y >= ey + 14 || p.y + p.h <= ey) return null;
  if (p.vy > 0 && p.y + p.h - e.y <= 8) {
    e.dead = true;
    e.deadT = 0;
    p.vy = STOMP_BOUNCE;
    return 'stomp';
  }
  if (p.invuln > 0) return null;
  p.vx = KNOCK_VX * Math.sign(p.x - e.x || 1);
  p.vy = KNOCK_VY;
  p.invuln = INVULN;
  return 'hurt';
}

export function overlapsFlag(p, level) {
  const x0 = level.flag.tx * TILE + 6;
  const x1 = level.flag.tx * TILE + 10;
  return p.x < x1 && p.x + p.w > x0;
}
