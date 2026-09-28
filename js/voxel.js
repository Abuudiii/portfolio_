import * as THREE from 'three';
import { B, BLOCKS, HOTBAR } from './blocks.js';
import { buildTiles, mulberry32, TILE_PX } from './textures.js';
import { generateWorld, WX, WZ, CHUNK, G } from './world.js';
import { createPlayer, stepPlayer, raycast, viewDir, blockIntersectsPlayer, STEP, EYE } from './physics.js';
import { buildChunkMesh } from './mesher.js';

const SKY = '#8FB8FF';
const ATLAS_COLS = 8;
const CHUNKS_X = WX / CHUNK;
const CHUNKS_Z = WZ / CHUNK;
const MAX_STEPS = 12;
const MAX_REBUILDS = 4;
const MOUSE_SENS = 0.0025;
const TOUCH_SENS = 0.005;
const PITCH_MAX = 1.55;
const STICK_R = 60;
const LABEL_FONT = "'Pixelify Sans', monospace";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const keyOf = (x, y, z) => `${x},${y},${z}`;

function tileCanvas(data) {
  const c = document.createElement('canvas');
  c.width = c.height = TILE_PX;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), TILE_PX, TILE_PX), 0, 0);
  return c;
}

function pixelTexture(source) {
  const tex = new THREE.CanvasTexture(source);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initials(org) {
  return org
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 3)
    .join('');
}

export function createGame({ canvas, stops, projects, profile, touch, onInteract, onHud, onLockChange }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch (err) {
    console.error('WebGL unavailable', err);
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 48, 120);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 250);
  camera.rotation.order = 'YXZ';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- World + state ----------
  const gen = generateWorld(stops, projects, profile);
  const world = gen.world;
  const player = createPlayer(gen.spawn);
  const state = { player, world, gen, found: new Set(), zone: '', targetLabel: '', slot: 0, target: null };

  // ---------- Atlas ----------
  const tiles = buildTiles(stops);
  const atlasRows = Math.ceil(tiles.names.length / ATLAS_COLS);
  const atlas = document.createElement('canvas');
  atlas.width = ATLAS_COLS * TILE_PX;
  atlas.height = atlasRows * TILE_PX;
  const actx = atlas.getContext('2d');
  const tileIndex = new Map();
  tiles.names.forEach((name, i) => {
    tileIndex.set(name, i);
    const img = new ImageData(new Uint8ClampedArray(tiles.data.get(name)), TILE_PX, TILE_PX);
    actx.putImageData(img, (i % ATLAS_COLS) * TILE_PX, Math.floor(i / ATLAS_COLS) * TILE_PX);
  });
  const blockMaterial = new THREE.MeshBasicMaterial({ map: pixelTexture(atlas), vertexColors: true, alphaTest: 0.5 });
  const dirtDataUrl = tileCanvas(tiles.data.get('dirt')).toDataURL();

  // ---------- Chunks ----------
  const chunkMeshes = new Array(CHUNKS_X * CHUNKS_Z).fill(null);
  const dirty = new Set();

  function buildChunk(cx, cz) {
    const ci = cz * CHUNKS_X + cx;
    const old = chunkMeshes[ci];
    if (old) {
      scene.remove(old);
      old.geometry.dispose();
      chunkMeshes[ci] = null;
    }
    const m = buildChunkMesh(world, cx, cz, tileIndex, ATLAS_COLS, atlasRows);
    if (!m.indices.length) return;
    const vertCount = m.positions.length / 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(m.colors, m.colors.length / vertCount));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, blockMaterial);
    chunkMeshes[ci] = mesh;
    scene.add(mesh);
  }

  for (let cz = 0; cz < CHUNKS_Z; cz++) for (let cx = 0; cx < CHUNKS_X; cx++) buildChunk(cx, cz);

  function markChunk(cx, cz) {
    if (cx >= 0 && cx < CHUNKS_X && cz >= 0 && cz < CHUNKS_Z) dirty.add(cz * CHUNKS_X + cx);
  }

  function markDirty(x, z) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    markChunk(cx, cz);
    if (lx === 0) markChunk(cx - 1, cz);
    if (lx === CHUNK - 1) markChunk(cx + 1, cz);
    if (lz === 0) markChunk(cx, cz - 1);
    if (lz === CHUNK - 1) markChunk(cx, cz + 1);
  }

  function rebuildDirty() {
    let n = 0;
    for (const ci of dirty) {
      if (n++ >= MAX_REBUILDS) break;
      dirty.delete(ci);
      buildChunk(ci % CHUNKS_X, Math.floor(ci / CHUNKS_X));
    }
  }

  // ---------- Decor ----------
  function buildLabels() {
    for (const label of gen.labels) {
      const size = label.big ? 48 : 32;
      const lh = label.big ? 60 : 40;
      const pad = 12;
      const font = `700 ${size}px ${LABEL_FONT}`;
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.font = font;
      const textW = Math.max(...label.lines.map((l) => ctx.measureText(l).width));
      c.width = Math.ceil(textW) + pad * 2;
      c.height = label.lines.length * lh + pad * 2;
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = font;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      label.lines.forEach((line, i) => ctx.fillText(line, c.width / 2, pad + lh * i + lh / 2));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTexture(c), transparent: true }));
      const h = label.lines.length * (label.big ? 0.55 : 0.35);
      sprite.scale.set((c.width / c.height) * h, h, 1);
      sprite.position.set(label.x, label.y, label.z);
      scene.add(sprite);
    }
  }

  function buildBoards() {
    for (const board of gen.boards) {
      const c = document.createElement('canvas');
      c.width = board.w * 64;
      c.height = board.h * 64;
      const ctx = c.getContext('2d');
      const heights = board.lines.map((_, i) => (i === 0 ? 54 : 32));
      let y = (c.height - heights.reduce((a, b) => a + b, 0)) / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      board.lines.forEach((line, i) => {
        ctx.font = `700 ${i === 0 ? 44 : 26}px ${LABEL_FONT}`;
        const cy = y + heights[i] / 2;
        ctx.fillStyle = '#000000';
        ctx.fillText(line, c.width / 2 + 3, cy + 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(line, c.width / 2, cy);
        y += heights[i];
      });
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(board.w, board.h),
        new THREE.MeshBasicMaterial({ map: pixelTexture(c), transparent: true }),
      );
      mesh.position.set(board.x, board.y, board.z);
      scene.add(mesh);
    }
  }

  function buildBanners() {
    for (const banner of gen.banners) {
      const stop = stops[banner.stopIndex];
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 32, 32);
      const tex = pixelTexture(c);
      const drawInitials = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 32, 32);
        ctx.font = `14px ${LABEL_FONT}`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials(stop.org), 16, 16);
        tex.needsUpdate = true;
      };
      if (stop.logo) {
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 32, 32);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, 32, 32);
          tex.needsUpdate = true;
        };
        img.onerror = drawInitials;
        img.src = stop.logo;
      } else drawInitials();
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(banner.w, banner.h),
        new THREE.MeshBasicMaterial({ map: tex }),
      );
      mesh.rotation.y = Math.PI;
      mesh.position.set(banner.x, banner.y, banner.z);
      scene.add(mesh);
    }
  }

  buildBanners();
  const fontReady = document.fonts?.load("700 32px 'Pixelify Sans'") ?? Promise.resolve();
  fontReady
    .catch(() => {})
    .then(() => {
      buildLabels();
      buildBoards();
    });

  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: '#9FE8FF',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  for (const b of gen.beacons) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 60, 0.6), beaconMaterial);
    mesh.position.set(b.x, b.y0 + 30, b.z);
    scene.add(mesh);
  }

  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const clouds = [];
  {
    const rng = mulberry32(777);
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(6 + rng() * 8, 1, 4 + rng() * 5), cloudMaterial);
      mesh.position.set(-20 + rng() * (WX + 40), 52, -20 + rng() * (WZ + 40));
      scene.add(mesh);
      clouds.push(mesh);
    }
  }

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: '#000000', transparent: true, opacity: 0.6 }),
  );
  outline.visible = false;
  scene.add(outline);

  // ---------- Hotbar ----------
  const hotbar = document.getElementById('hotbar');
  const slotEls = HOTBAR.map((id, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.append(tileCanvas(tiles.data.get(BLOCKS[id].tiles.side)));
    if (touch) {
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setSlot(i);
      });
    }
    return slot;
  });
  hotbar.replaceChildren(...slotEls);

  function setSlot(i) {
    state.slot = i;
    slotEls.forEach((s, j) => s.classList.toggle('sel', j === i));
  }
  setSlot(0);

  // ---------- Input ----------
  const keys = { f: 0, b: 0, l: 0, r: 0, jump: false, sprint: false };
  const stick = { f: 0, s: 0 };
  let touchJump = false;
  const input = { f: 0, s: 0, jump: false, sprint: false };

  const stickEl = document.getElementById('t-stick');
  const knob = stickEl?.querySelector('.stick-knob');

  function clearInput() {
    keys.f = keys.b = keys.l = keys.r = 0;
    keys.jump = keys.sprint = false;
    stick.f = stick.s = 0;
    touchJump = false;
    if (knob) knob.style.transform = '';
  }

  function syncInput() {
    input.f = clamp(keys.f - keys.b + stick.f, -1, 1);
    input.s = clamp(keys.r - keys.l + stick.s, -1, 1);
    input.jump = keys.jump || touchJump;
    input.sprint = keys.sprint;
  }

  let running = false;
  let locked = false;
  const dialogOpen = () => !!document.querySelector('dialog[open]');
  const inPlay = () => document.body.classList.contains('mode-play');

  const debugEl = document.getElementById('debug-overlay');

  const KEYMAP = {
    KeyW: 'f', ArrowUp: 'f',
    KeyS: 'b', ArrowDown: 'b',
    KeyA: 'l', ArrowLeft: 'l',
    KeyD: 'r', ArrowRight: 'r',
  };

  addEventListener('keydown', (e) => {
    if (!running || !inPlay() || dialogOpen()) return;
    const code = e.code;
    if (code in KEYMAP) keys[KEYMAP[code]] = 1;
    else if (code === 'Space') keys.jump = true;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = true;
    else if (/^Digit[1-9]$/.test(code)) setSlot(Number(code.slice(5)) - 1);
    else if (code === 'KeyR') respawn();
    else if (code === 'F3') {
      debugEl.hidden = !debugEl.hidden;
      debugTimer = 0;
    } else return;
    e.preventDefault();
  });

  addEventListener('keyup', (e) => {
    const code = e.code;
    if (code in KEYMAP) keys[KEYMAP[code]] = 0;
    else if (code === 'Space') keys.jump = false;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = false;
  });

  addEventListener('blur', clearInput);

  function respawn() {
    const s = gen.spawn;
    Object.assign(player, { x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, vx: 0, vy: 0, vz: 0 });
  }

  // ---------- Pointer lock ----------
  function requestLock() {
    if (touch) return;
    try {
      canvas.requestPointerLock()?.catch?.(() => {});
    } catch {
      /* pointer lock unavailable */
    }
  }

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) clearInput();
    onLockChange(locked);
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    player.yaw -= e.movementX * MOUSE_SENS;
    player.pitch = clamp(player.pitch - e.movementY * MOUSE_SENS, -PITCH_MAX, PITCH_MAX);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!locked) return;
    if (e.button === 0) breakTarget();
    else if (e.button === 2) use();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('click', () => {
    if (!locked && inPlay() && !dialogOpen()) requestLock();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!locked || !e.deltaY) return;
      e.preventDefault();
      setSlot((state.slot + Math.sign(e.deltaY) + 9) % 9);
    },
    { passive: false },
  );

  // ---------- Actions ----------
  function freshHit() {
    return raycast(world, player.x, player.y + EYE, player.z, ...viewDir(player.yaw, player.pitch));
  }

  function breakTarget() {
    if (!running) return;
    const hit = freshHit();
    if (!hit) return;
    if (world.get(hit.x, hit.y, hit.z) === B.BEDROCK || gen.interact.has(keyOf(hit.x, hit.y, hit.z))) return;
    world.set(hit.x, hit.y, hit.z, B.AIR);
    markDirty(hit.x, hit.z);
  }

  function use() {
    if (!running) return;
    const hit = freshHit();
    if (!hit) return;
    const entry = gen.interact.get(keyOf(hit.x, hit.y, hit.z));
    if (entry) {
      state.found.add(`${entry.kind}:${entry.index}`);
      onHud(state);
      clearInput();
      onInteract(entry);
      return;
    }
    const bx = hit.x + hit.nx;
    const by = hit.y + hit.ny;
    const bz = hit.z + hit.nz;
    if (!world.inBounds(bx, by, bz) || world.get(bx, by, bz) !== B.AIR) return;
    if (blockIntersectsPlayer(player, bx, by, bz)) return;
    world.set(bx, by, bz, HOTBAR[state.slot]);
    markDirty(bx, bz);
  }

  // ---------- Touch ----------
  if (touch) {
    let stickId = null;
    let stickCx = 0;
    let stickCy = 0;
    stickEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stickEl.setPointerCapture(e.pointerId);
      stickId = e.pointerId;
      const r = stickEl.getBoundingClientRect();
      stickCx = r.left + r.width / 2;
      stickCy = r.top + r.height / 2;
    });
    stickEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      e.preventDefault();
      let dx = e.clientX - stickCx;
      let dy = e.clientY - stickCy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_R) {
        dx *= STICK_R / len;
        dy *= STICK_R / len;
      }
      stick.s = dx / STICK_R;
      stick.f = -dy / STICK_R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const stickEnd = (e) => {
      if (e.pointerId !== stickId) return;
      e.preventDefault();
      stickId = null;
      stick.f = stick.s = 0;
      knob.style.transform = '';
    };
    stickEl.addEventListener('pointerup', stickEnd);
    stickEl.addEventListener('pointercancel', stickEnd);

    const look = document.getElementById('t-look');
    let lookId = null;
    let lookX = 0;
    let lookY = 0;
    let lookStartX = 0;
    let lookStartY = 0;
    let lookT = 0;
    look.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      look.setPointerCapture(e.pointerId);
      lookId = e.pointerId;
      lookX = lookStartX = e.clientX;
      lookY = lookStartY = e.clientY;
      lookT = performance.now();
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      e.preventDefault();
      if (running) {
        player.yaw -= (e.clientX - lookX) * TOUCH_SENS;
        player.pitch = clamp(player.pitch - (e.clientY - lookY) * TOUCH_SENS, -PITCH_MAX, PITCH_MAX);
      }
      lookX = e.clientX;
      lookY = e.clientY;
    });
    look.addEventListener('pointerup', (e) => {
      if (e.pointerId !== lookId) return;
      e.preventDefault();
      lookId = null;
      const moved = Math.hypot(e.clientX - lookStartX, e.clientY - lookStartY);
      if (performance.now() - lookT < 250 && moved < 8) use();
    });
    look.addEventListener('pointercancel', (e) => {
      if (e.pointerId === lookId) lookId = null;
    });

    const jumpBtn = document.getElementById('t-jump');
    jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jumpBtn.setPointerCapture(e.pointerId);
      touchJump = true;
    });
    for (const type of ['pointerup', 'pointercancel']) {
      jumpBtn.addEventListener(type, (e) => {
        e.preventDefault();
        touchJump = false;
      });
    }
    document.getElementById('t-break').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      breakTarget();
    });
    document.getElementById('t-use').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      use();
    });
  }

  // ---------- Simulation ----------
  function updateZone() {
    const fx = Math.floor(player.x);
    const zone = gen.zones.find((z) => fx >= z.x0 && fx < z.x1)?.label ?? state.zone;
    if (zone !== state.zone) {
      state.zone = zone;
      onHud(state);
    }
  }

  function updateTarget() {
    const hit = freshHit();
    state.target = hit;
    const label = hit ? (gen.interact.get(keyOf(hit.x, hit.y, hit.z))?.label ?? '') : '';
    if (label !== state.targetLabel) {
      state.targetLabel = label;
      onHud(state);
    }
    outline.visible = !!hit;
    if (hit) outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  }

  updateZone();

  // ---------- Debug overlay ----------
  let debugTimer = 0;
  let fps = 0;
  let fpsFrames = 0;
  let fpsTime = 0;

  function refreshDebug() {
    const [dx, , dz] = viewDir(player.yaw, player.pitch);
    const facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : dz < 0 ? 'north' : 'south';
    const bx = Math.floor(player.x);
    const by = Math.floor(player.y);
    const bz = Math.floor(player.z);
    debugEl.textContent = [
      `${profile.name}'s World (portfolio edition)`,
      `XYZ: ${player.x.toFixed(1)} / ${player.y.toFixed(1)} / ${player.z.toFixed(1)}`,
      `Block: ${bx} ${by} ${bz}`,
      `Chunk: ${Math.floor(bx / CHUNK)} ${Math.floor(bz / CHUNK)}`,
      `Facing: ${facing}`,
      `Zone: ${state.zone}`,
      `Currently: ${profile.currently}`,
      `FPS: ${fps}`,
    ].join('\n');
  }

  // ---------- Loop ----------
  function resize() {
    const parent = canvas.parentElement;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  let started = false;
  let last = 0;
  let acc = 0;
  const panoTarget = new THREE.Vector3();

  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });

  function frame(t) {
    const frameDt = Math.min(0.1, (t - last) / 1000);
    last = t;

    for (const cloud of clouds) {
      cloud.position.x += 0.6 * frameDt;
      if (cloud.position.x > WX + 20) cloud.position.x = -20;
    }

    if (running) {
      acc += frameDt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS) {
        syncInput();
        stepPlayer(player, input, world, STEP);
        updateZone();
        acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS) acc = 0;
      updateTarget();
      camera.position.set(player.x, player.y + EYE, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
    } else if (document.body.classList.contains('mode-title')) {
      // Slow ping-pong flyover along the path from the southern hills, facing the building fronts.
      const k = reducedMotion ? 0.2 : 0.5 - 0.5 * Math.cos((t / 1000) * (Math.PI / 60));
      const x = 20 + 180 * k;
      camera.position.set(x, G + 9, 24);
      camera.lookAt(panoTarget.set(x + 8, G + 4, 40));
    }

    fpsFrames++;
    fpsTime += frameDt;
    if (fpsTime >= 1) {
      fps = Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
    }
    if (!debugEl.hidden) {
      debugTimer -= frameDt;
      if (debugTimer <= 0) {
        debugTimer = 0.25;
        refreshDebug();
      }
    }

    rebuildDirty();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  const game = {
    start() {
      if (started) return;
      started = true;
      resize();
      onLockChange(false);
      last = performance.now();
      requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      clearInput();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    resume() {
      running = true;
      last = performance.now();
      acc = 0;
    },
    isRunning: () => running,
    requestLock,
    use,
    breakTarget,
    dirtDataUrl,
    state,
  };

  if (new URLSearchParams(location.search).has('debug')) window.__vw = { state, game };

  return game;
}
