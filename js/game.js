import { buildLevel, T, TILE, LEVEL_H, GROUND_Y } from './level.js';
import {
  STEP,
  createPlayer,
  stepPlayer,
  stepEnemy,
  resolveEnemyContact,
  overlapsFlag,
} from './engine.js';
import { PALETTE, bakeSprites, bakeLogo } from './sprites.js';
import { sfx, setSound, soundOn } from './audio.js';

const FONT = "8px 'Press Start 2P', monospace";
const GROUND_PX = GROUND_Y * TILE;
const MAX_STEPS = 12;
const COIN_RISE_T = 0.35;
const BUMP_T = 0.15;
const BUMP_PX = 12;
const HIT_DELAY = 0.3;
const SLIDE_VY = 90;
const WALK_VX = 60;
const WALK_T = 1.2;
const PARTY_T = 1.5;
const CONFETTI_G = 300;
const DEAD_T = 0.5;

const TILE_SPRITE = {
  [T.GROUND]: 'ground',
  [T.BRICK]: 'brick',
  [T.USED]: 'used',
  [T.PIPE_TL]: 'pipe_tl',
  [T.PIPE_TR]: 'pipe_tr',
  [T.PIPE_L]: 'pipe_l',
  [T.PIPE_R]: 'pipe_r',
  [T.STAIR]: 'stair',
};

const KEY_MAP = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ' ': 'jump',
  ArrowUp: 'jump',
  w: 'jump',
  W: 'jump',
  z: 'jump',
  Z: 'jump',
};

const initials = (org) =>
  org
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function createGame({ canvas, stops, projects, onHit, onGoal, onHud }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const stage = canvas.parentElement;

  const level = buildLevel(stops, projects);
  const state = {
    player: createPlayer(level.spawn.x, level.spawn.y),
    level,
    enemies: level.enemies.map((e) => ({ ...e })),
    coinsFound: new Set(),
    bugs: 0,
    zone: level.zones[0].label,
    cleared: false,
  };
  // Settle the player onto the ground so the idle title scene shows the standing sprite.
  for (let i = 0; i < 12; i++) stepPlayer(state.player, { left: false, right: false, jump: false, jumpPressed: false }, level, STEP);

  const sprites = bakeSprites();
  const logos = stops.map(() => null);
  stops.forEach((stop, i) => {
    const img = new Image();
    img.addEventListener('load', () => {
      logos[i] = bakeLogo(img);
    });
    img.src = stop.logo;
  });

  const input = { left: false, right: false, jump: false, jumpPressed: false };
  const coins = []; // {x, y, t}
  const confetti = []; // {x, y, vx, vy, color}
  const bumps = new Map(); // 'tx,ty' -> remaining seconds
  const timers = []; // {t, fn}
  const confettiColors = Object.entries(PALETTE)
    .filter(([k]) => k !== 'S' && k !== 'K')
    .map(([, c]) => c);
  let goal = null; // {phase, t}
  let flagY = level.flag.topTy * TILE + 8;

  let scale = 2;
  let viewW = 320;
  let viewH = 224;
  let camX = 0;
  let running = false;
  let started = false;
  let last = null;
  let acc = 0;
  let clock = 0;

  // ---------- Sizing ----------

  function resize() {
    const cw = stage.clientWidth || innerWidth;
    const ch = stage.clientHeight || innerHeight;
    scale = Math.max(2, Math.floor(Math.min(ch / 224, cw / 320)));
    viewW = Math.ceil(cw / scale);
    viewH = Math.ceil(ch / scale);
    canvas.width = viewW;
    canvas.height = viewH;
    canvas.style.width = `${viewW * scale}px`;
    canvas.style.height = `${viewH * scale}px`;
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize);
  resize();

  // ---------- Input ----------

  const active = () =>
    running && document.body.classList.contains('mode-play') && !document.querySelector('dialog[open]');

  function clearInput() {
    input.left = input.right = input.jump = input.jumpPressed = false;
  }

  function press(action) {
    if (action === 'jump' && !input.jump) input.jumpPressed = true;
    input[action] = true;
  }

  addEventListener('keydown', (e) => {
    if (!active()) return;
    if (e.key === 'm' || e.key === 'M') {
      setSound(!soundOn());
      onHud(state);
      return;
    }
    const action = KEY_MAP[e.key];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat || action !== 'jump') press(action);
  });
  addEventListener('keyup', (e) => {
    const action = KEY_MAP[e.key];
    if (!action) return;
    if (active()) e.preventDefault();
    input[action] = false;
  });
  addEventListener('blur', clearInput);

  for (const [id, action] of [
    ['t-left', 'left'],
    ['t-right', 'right'],
    ['t-jump', 'jump'],
  ]) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      if (active()) press(action);
    });
    const release = () => {
      input[action] = false;
    };
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(type, release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  document.addEventListener('visibilitychange', () => {
    last = null;
    clearInput();
  });

  // ---------- Update ----------

  function handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'jump') sfx('jump');
      else if (ev.type === 'bump') {
        sfx('bump');
        bumps.set(`${ev.tx},${ev.ty}`, BUMP_T);
      } else if (ev.type === 'hit') {
        const key = `${ev.tx},${ev.ty}`;
        sfx(ev.first ? 'coin' : 'bump');
        coins.push({ x: ev.tx * TILE + 4, y: ev.ty * TILE - 14, t: 0 });
        bumps.set(key, BUMP_T);
        const sizeBefore = state.coinsFound.size;
        state.coinsFound.add(key);
        if (state.coinsFound.size !== sizeBefore) onHud(state);
        const block = level.blocks.get(key);
        if (block) timers.push({ t: HIT_DELAY, fn: () => onHit(block) });
      }
    }
  }

  function startGoal() {
    const p = state.player;
    state.cleared = true;
    p.locked = true;
    p.x = level.flag.tx * TILE + 8 - p.w;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    goal = { phase: 'slide', t: 0 };
    clearInput();
  }

  function stepGoal(dt) {
    const p = state.player;
    goal.t += dt;
    if (goal.phase === 'slide') {
      p.vy = SLIDE_VY;
      p.y = Math.min(p.y + SLIDE_VY * dt, GROUND_PX - p.h);
      flagY = Math.min(Math.max(flagY, p.y), GROUND_PX - 2 * TILE);
      p.onGround = p.y >= GROUND_PX - p.h;
      if (p.onGround) {
        p.vy = 0;
        goal = { phase: 'walk', t: 0 };
      }
    } else if (goal.phase === 'walk') {
      p.vx = WALK_VX;
      p.x += WALK_VX * dt;
      p.anim += (dt * WALK_VX) / 110;
      if (goal.t >= WALK_T) {
        p.vx = 0;
        goal = { phase: 'party', t: 0 };
        sfx('clear');
        for (let i = 0; i < 40; i++) {
          confetti.push({
            x: p.x + p.w / 2,
            y: p.y,
            vx: (Math.random() - 0.5) * 160,
            vy: -120 - Math.random() * 160,
            color: confettiColors[i % confettiColors.length],
          });
        }
      }
    } else if (goal.phase === 'party' && goal.t >= PARTY_T) {
      goal = null;
      confetti.length = 0;
      onGoal();
      p.locked = false;
    }
  }

  function update(dt) {
    clock += dt;
    const p = state.player;
    if (goal) stepGoal(dt);
    else handleEvents(stepPlayer(p, input, level, dt));
    input.jumpPressed = false;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.dead) {
        e.deadT += dt;
        if (e.deadT >= DEAD_T) state.enemies.splice(i, 1);
        continue;
      }
      stepEnemy(e, level, dt);
      if (goal) continue;
      const r = resolveEnemyContact(p, e);
      if (r === 'stomp') {
        sfx('stomp');
        state.bugs++;
        onHud(state);
      } else if (r === 'hurt') sfx('hurt');
    }

    if (!state.cleared && overlapsFlag(p, level)) startGoal();

    for (let i = coins.length - 1; i >= 0; i--) {
      coins[i].t += dt;
      if (coins[i].t >= COIN_RISE_T) coins.splice(i, 1);
    }
    for (const c of confetti) {
      c.vy += CONFETTI_G * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }
    for (const [key, t] of bumps) {
      if (t - dt <= 0) bumps.delete(key);
      else bumps.set(key, t - dt);
    }
    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) {
        const { fn } = timers[i];
        timers.splice(i, 1);
        fn();
      }
    }

    const tx = Math.floor(p.x / TILE);
    const zone = level.zones.find((z) => tx >= z.x0 && tx < z.x1);
    if (zone && zone.label !== state.zone) {
      state.zone = zone.label;
      onHud(state);
    }
  }

  // ---------- Render ----------

  function draw(name, x, y, flip = false) {
    const s = sprites.get(name);
    if (s) ctx.drawImage(flip ? s.flip : s.img, Math.round(x), Math.round(y));
  }

  function updateCamera() {
    const p = state.player;
    if (p.x - camX > viewW * 0.55) camX = p.x - viewW * 0.55;
    else if (p.x - camX < viewW * 0.3) camX = p.x - viewW * 0.3;
    camX = Math.round(Math.max(0, Math.min(level.w * TILE - viewW, camX)));
  }

  function drawBuilding(d, camY) {
    const stop = stops[d.stopIndex];
    const W = d.w * TILE;
    const H = d.h * TILE;
    const x = d.tx * TILE - camX;
    const y = GROUND_PX - H - camY;
    if (x > viewW || x + W < 0) return;
    ctx.fillStyle = PALETTE.K;
    ctx.fillRect(x, y, W, H);
    ctx.fillStyle = stop.color;
    ctx.fillRect(x + 1, y + 1, W - 2, H - 1);

    const doorW = 2 * TILE;
    const doorX = x + (W - doorW) / 2;
    const doorY = y + H - 2 * TILE;
    const signX = x + W / 2 - 10;
    const signY = doorY - 24;
    ctx.fillStyle = PALETTE.Y;
    for (let wy = y + 2 * TILE; wy + 5 <= y + H - 2 * TILE; wy += 8) {
      for (let wx = x + 2 * TILE; wx + 4 <= x + W - 2 * TILE; wx += 8) {
        const hitsSign = wx + 4 > signX - 2 && wx < signX + 22 && wy + 5 > signY - 2;
        if (!hitsSign) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    ctx.fillStyle = PALETTE.K;
    ctx.fillRect(doorX, doorY, doorW, 2 * TILE);

    ctx.fillStyle = PALETTE.K;
    ctx.fillRect(signX - 1, signY - 1, 22, 22);
    ctx.fillStyle = PALETTE.W;
    ctx.fillRect(signX, signY, 20, 20);
    const logo = logos[d.stopIndex];
    if (logo) ctx.drawImage(logo, signX + 2, signY + 2);
    else {
      ctx.fillStyle = PALETTE.K;
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.fillText(initials(stop.org), signX + 10, signY + 14);
      ctx.textAlign = 'left';
    }
    if (stop.current) draw('flag', x + W - TILE, y - TILE);
  }

  function drawCastle(d, camY) {
    const x0 = d.tx * TILE - camX;
    if (x0 > viewW || x0 + d.w * TILE < 0) return;
    const brick = (cx, cy) => draw('brick', x0 + cx * TILE, cy * TILE - camY);
    // Lower hall: 3 rows, full width; crenellations on alternate columns above it.
    for (let r = 9; r <= 11; r++) for (let c = 0; c < d.w; c++) brick(c, r);
    for (let c = 0; c < d.w; c++) if (c % 2 === 0 || (c >= 2 && c <= 4)) brick(c, 8);
    // Tower: 2 rows on the middle 3 columns, with its own crenellations.
    for (let r = 6; r <= 7; r++) for (let c = 2; c <= 4; c++) brick(c, r);
    brick(2, 5);
    brick(4, 5);
    ctx.fillStyle = PALETTE.K;
    const doorX = x0 + 3 * TILE;
    const doorTop = 10 * TILE - camY;
    ctx.fillRect(doorX, doorTop + 4, TILE, GROUND_PX - camY - doorTop - 4);
    ctx.fillRect(doorX + 2, doorTop + 1, TILE - 4, 3);
    ctx.fillRect(doorX + 5, doorTop, TILE - 10, 1);
    ctx.fillRect(x0 + 3 * TILE + 5, 6 * TILE - camY + 4, 6, 8);
  }

  function render() {
    updateCamera();
    const camY = LEVEL_H * TILE - viewH;
    const p = state.player;

    ctx.fillStyle = PALETTE.S;
    ctx.fillRect(0, 0, viewW, viewH);

    // Parallax layer
    const px = Math.round(camX * 0.5);
    for (const type of ['hill', 'cloud']) {
      for (const d of level.decor) {
        if (d.type !== type) continue;
        const x = d.tx * TILE - px;
        if (x > viewW || x + 48 < 0) continue;
        draw(type, x, d.ty * TILE - camY);
      }
    }

    // Decor
    for (const d of level.decor) {
      if (d.type === 'building') drawBuilding(d, camY);
      else if (d.type === 'castle') drawCastle(d, camY);
    }
    for (const d of level.decor) {
      if (d.type !== 'bush' && d.type !== 'signpost') continue;
      const x = d.tx * TILE - camX;
      if (x > viewW || x + 32 < 0) continue;
      draw(d.type, x, d.ty * TILE - camY);
    }

    // Tiles
    const qframe = `qblock${(Math.floor(clock * 3) % 3) + 1}`;
    const tx0 = Math.max(0, Math.floor(camX / TILE));
    const tx1 = Math.min(level.w - 1, Math.floor((camX + viewW) / TILE));
    for (let ty = 0; ty < level.h; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const id = level.tiles[ty * level.w + tx];
        if (id === T.EMPTY) continue;
        const name = id === T.QBLOCK ? qframe : TILE_SPRITE[id];
        const bump = bumps.get(`${tx},${ty}`);
        const off = bump ? -Math.round(BUMP_PX * Math.sin(Math.PI * (1 - bump / BUMP_T))) : 0;
        draw(name, tx * TILE - camX, ty * TILE - camY + off);
      }
    }

    // Flag pole + flag
    const poleX = level.flag.tx * TILE + 7 - camX;
    const poleTop = level.flag.topTy * TILE - camY;
    ctx.fillStyle = PALETTE.W;
    ctx.fillRect(poleX, poleTop + 4, 2, GROUND_PX - camY - poleTop - 4);
    ctx.fillStyle = PALETTE.K;
    ctx.fillRect(poleX - 1, poleTop - 1, 4, 6);
    ctx.fillRect(poleX - 2, poleTop, 6, 4);
    draw('flag', poleX - 16, flagY - camY);

    // Coins, confetti
    for (const c of coins) {
      const k = c.t / COIN_RISE_T;
      const frame = `coin${(Math.floor(c.t * 16) % 4) + 1}`;
      draw(frame, c.x - camX, c.y - camY - 36 * Math.sin((Math.PI / 2) * k));
    }
    for (const c of confetti) {
      ctx.fillStyle = c.color;
      ctx.fillRect(Math.round(c.x - camX), Math.round(c.y - camY), 2, 2);
    }

    // Enemies
    for (const e of state.enemies) {
      const x = e.x - camX;
      if (x > viewW || x + 16 < 0) continue;
      const name = e.dead ? 'bug_flat' : `bug${(Math.floor((e.anim || 0) * 4) % 2) + 1}`;
      draw(name, x, e.y - camY);
    }

    // Player
    const blink = p.invuln > 0 && Math.floor(p.invuln / 0.06) % 2 === 1;
    if (!blink) {
      let name = 'player_idle';
      if (!p.onGround) name = 'player_jump';
      else if (Math.abs(p.vx) > 5) name = `player_run${(Math.floor(p.anim * 8) % 3) + 1}`;
      draw(name, p.x - 2 - camX, p.y - 1 - camY, p.facing < 0);
    }

    // Sign text
    ctx.font = FONT;
    for (const s of level.signs) {
      const x = s.tx * TILE - camX;
      const y = s.ty * TILE - camY + 8;
      if (x > viewW) continue;
      ctx.fillStyle = PALETTE.K;
      ctx.fillText(s.text, x + 1, y + 1);
      ctx.fillStyle = PALETTE.W;
      ctx.fillText(s.text, x, y);
    }
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (last == null) last = t;
    const frameDt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (running) {
      acc += frameDt;
      let n = 0;
      while (acc >= STEP && n < MAX_STEPS) {
        update(STEP);
        acc -= STEP;
        n++;
      }
      if (n === MAX_STEPS) acc = 0;
    } else {
      clock += frameDt;
    }
    render();
  }

  const game = {
    start() {
      if (started) return;
      started = true;
      const fontReady = document.fonts?.load ? document.fonts.load(FONT).catch(() => {}) : Promise.resolve();
      fontReady.then(() => requestAnimationFrame(frame));
    },
    pause() {
      running = false;
      clearInput();
    },
    resume() {
      running = true;
      last = null;
      acc = 0;
      clearInput();
    },
    isRunning: () => running,
    state,
  };

  if (new URLSearchParams(location.search).has('debug')) window.__pq = { state, game };
  return game;
}
