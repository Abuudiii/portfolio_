export const TILE = 16;
export const LEVEL_H = 14;
export const GROUND_Y = 12;

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QBLOCK: 3,
  USED: 4,
  PIPE_TL: 5,
  PIPE_TR: 6,
  PIPE_L: 7,
  PIPE_R: 8,
  STAIR: 9,
};

const START_W = 24;
const STOP_W = 32;
const ARCADE_W = 48;
const GOAL_W = 28;

export function buildLevel(stops, projects) {
  const arcadeX = START_W + STOP_W * stops.length;
  const goalX = arcadeX + ARCADE_W;
  const w = goalX + GOAL_W;
  const h = LEVEL_H;
  const tiles = new Uint8Array(w * h);
  const blocks = new Map();
  const enemies = [];
  const decor = [];
  const zones = [];
  const signs = [];

  const set = (tx, ty, id) => {
    tiles[ty * w + tx] = id;
  };
  const enemy = (fromTx, toTx) =>
    enemies.push({ x: (fromTx + 1) * TILE, y: 11 * TILE, minX: fromTx * TILE, maxX: toTx * TILE });

  for (let tx = 0; tx < w; tx++) {
    for (let ty = GROUND_Y; ty < h; ty++) set(tx, ty, T.GROUND);
  }

  // Start
  zones.push({ x0: 0, x1: START_W, label: 'START' });
  signs.push(
    { tx: 3, ty: 3, text: 'ABDULLAH SHEIKH' },
    { tx: 3, ty: 5, text: 'SOFTWARE ENGINEER' },
    { tx: 3, ty: 7, text: '← → MOVE   SPACE JUMP   HIT ? BLOCKS' },
  );
  decor.push({ type: 'cloud', tx: 14, ty: 1 }, { type: 'hill', tx: 16, ty: 10 }, { type: 'bush', tx: 9, ty: 11 });

  // One world per stop
  stops.forEach((stop, i) => {
    const x0 = START_W + STOP_W * i;
    zones.push({ x0, x1: x0 + STOP_W, label: `WORLD ${i + 1} · ${stop.org.toUpperCase()}` });
    decor.push(
      { type: 'building', stopIndex: i, tx: x0 + 4, w: 10, h: stop.kind === 'education' ? 6 : 8 },
      { type: 'signpost', tx: x0 + 2, ty: 11 },
      { type: 'cloud', tx: x0 + 6, ty: 2 },
      { type: 'bush', tx: x0 + 19, ty: 11 },
      { type: 'hill', tx: x0 + 27, ty: 10 },
    );
    set(x0 + 15, 8, T.BRICK);
    set(x0 + 16, 8, T.QBLOCK);
    set(x0 + 17, 8, T.BRICK);
    blocks.set(`${x0 + 16},8`, { kind: 'stop', index: i });
    set(x0 + 22, 10, T.PIPE_TL);
    set(x0 + 23, 10, T.PIPE_TR);
    set(x0 + 22, 11, T.PIPE_L);
    set(x0 + 23, 11, T.PIPE_R);
    enemy(x0 + 24, x0 + 30);
  });

  // Project arcade
  zones.push({ x0: arcadeX, x1: goalX, label: 'PROJECT ARCADE' });
  signs.push({ tx: arcadeX + 1, ty: 5, text: 'PROJECT ARCADE' });
  projects.forEach((_, k) => {
    const bx = arcadeX + 5 + 6 * k;
    let by = 8;
    if (k % 2) {
      for (let tx = bx - 1; tx <= bx + 1; tx++) set(tx, 9, T.BRICK);
      by = 5;
    }
    set(bx, by, T.QBLOCK);
    blocks.set(`${bx},${by}`, { kind: 'project', index: k });
  });
  enemy(arcadeX + 8, arcadeX + 14);
  enemy(arcadeX + 32, arcadeX + 40);
  decor.push(
    { type: 'cloud', tx: arcadeX + 10, ty: 1 },
    { type: 'cloud', tx: arcadeX + 30, ty: 2 },
    { type: 'hill', tx: arcadeX + 20, ty: 10 },
  );

  // Goal
  zones.push({ x0: goalX, x1: w, label: 'GOAL' });
  for (let j = 0; j < 4; j++) {
    for (let ty = 11 - j; ty <= 11; ty++) set(goalX + 4 + j, ty, T.STAIR);
  }
  const flag = { tx: goalX + 11, topTy: 3 };
  const castle = { tx: goalX + 16 };
  decor.push({ type: 'castle', tx: castle.tx, w: 7, h: 5 }, { type: 'cloud', tx: goalX + 8, ty: 2 });

  return {
    w,
    h,
    tiles,
    blocks,
    enemies,
    decor,
    zones,
    signs,
    flag,
    castle,
    spawn: { x: 3 * TILE, y: 11 * TILE },
  };
}
