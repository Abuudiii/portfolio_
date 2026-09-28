// Palette-indexed pixel art, drawn in code. Each sprite is an array of
// equal-width strings; every char is a PALETTE key or '.' (transparent).

export const PALETTE = {
  K: '#000000',
  W: '#FCFCFC',
  S: '#5C94FC', // sky
  B: '#C84C0C',
  O: '#FC9838',
  Y: '#F8B800',
  G: '#00A800',
  L: '#80D010',
  R: '#ED1C24',
  D: '#2038EC', // denim
  F: '#FCB8A0', // skin
  H: '#503000', // hair
  A: '#7C7C7C', // grey
  N: '#3C3C3C', // dark grey
};

// ---- authoring helpers (run once at module load) ----

const rep = (row, n) => Array(n).fill(row);

// Rasterise a filled shape with a 1px K outline around it.
// inside(x, y) tests pixel (x, y); paint(x, y) returns the fill key.
function shape(w, h, inside, paint) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      if (inside(x, y)) row += paint(x, y);
      else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) row += 'K';
      else row += '.';
    }
    rows.push(row);
  }
  return rows;
}

const inCircle = (x, y, cx, cy, r) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < r * r;

function lobes(w, h, circles, rect, floorY) {
  return (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h || y > floorY) return false;
    if (x >= rect[0] && x < rect[1] && y >= rect[2]) return true;
    return circles.some(([cx, cy, r]) => inCircle(x, y, cx, cy, r));
  };
}

// ---- player (16x16, facing right; hitbox cols 2..13, feet on row 15) ----

const PLAYER_TOP = [
  '................',
  '.....HHHHH......',
  '....HHHHHHHH....',
  '...HHHFFFFF.....',
  '...HHFFFFKFF....',
  '...HFFFFFFFFF...',
  '....FFFFFFF.....',
  '...RRRRRRRR.....',
  '..RRRRWRWRRR....',
  '..RRRRRRRRRR....',
];

const player_idle = [
  ...PLAYER_TOP,
  '..FRRRRRRRRF....',
  '...RRRRRRRR.....',
  '...DDDDDDDD.....',
  '...DDD..DDD.....',
  '...DDD..DDD.....',
  '..KKKK..KKKK....',
];

const player_run1 = [
  ...PLAYER_TOP,
  '.FRRRRRRRRRRF...',
  '...RRRRRRRR.....',
  '...DDDDDDDD.....',
  '..DDD....DDD....',
  '.DDD......DDD...',
  'KKK........KKK..',
];

const player_run2 = [
  ...PLAYER_TOP,
  '...RRRRRRRRF....',
  '...RRRRRRRR.....',
  '....DDDDDDD.....',
  '....DDDDDD......',
  '.....DDDD.......',
  '....KKKKKK......',
];

const player_run3 = [
  ...PLAYER_TOP,
  '..FRRRRRRRRRF...',
  '...RRRRRRRR.....',
  '...DDDDDDDD.....',
  '...DDD.DDD......',
  '..DDD...DDD.....',
  '.KKK.....KKK....',
];

const player_jump = [
  '...........FF...',
  '.....HHHHH.RR...',
  '....HHHHHHHHRR..',
  '...HHHFFFFF.RR..',
  '...HHFFFFKFFRR..',
  '...HFFFFFFFFRR..',
  '....FFFFFFFRR...',
  '...RRRRRRRRR....',
  '.FRRRRWRWRRR....',
  '..RRRRRRRRRR....',
  '...RRRRRRRR.....',
  '...RRRRRRRR.....',
  '...DDDDDDDD.....',
  '..DDDD..DDDD....',
  '..DDD....DDDKK..',
  '.KKK............',
];

// ---- bug enemy (16x16 green beetle) ----

const BUG_BODY = [
  '....KKGGGGKK....',
  '...KGGLLGGGGK...',
  '..KGLLGGGGGGGK..',
  '..KGWKGGGGWKGK..',
  '.KGGGGGKKGGGGGK.',
  '.KGLGGGKKGGGLGK.',
  '.KGGGGGKKGGGGGK.',
  '.KGGGGGKKGGGGGK.',
  '..KGGGGKKGGGGK..',
  '...KKKKKKKKKK...',
];

const bug1 = [
  '................',
  '....K......K....',
  '.....K....K.....',
  '......KKKK......',
  ...BUG_BODY,
  '..K..K....K..K..',
  '.K...K....K...K.',
];

const bug2 = [
  '................',
  '...K........K...',
  '....K......K....',
  '.....KKKKKK.....',
  ...BUG_BODY,
  '...K.K....K.K...',
  '...K..K..K..K...',
];

const bug_flat = [
  ...rep('................', 10),
  '....KKKKKKKK....',
  '..KKGGLLGGGGKK..',
  '.KGWKGGGGGGWKGK.',
  '.KGGGGGKKGGGGGK.',
  'KGGGGGGKKGGGGGGK',
  'KKKKKKKKKKKKKKKK',
];

// ---- blocks & tiles (16x16) ----

// '?' glyph occupies cols 4..10; 'q' is the glyph colour, '.' is Y fill.
const QMARK = [
  '.qqqq..',
  'qqBBqq.',
  'qqB.qqB',
  '.BB.qqB',
  '...qqBB',
  '..qqBB.',
  '..qqB..',
  '...BB..',
  '..qq...',
  '..qqB..',
];

function qblock(q) {
  return [
    'BBBBBBBBBBBBBBBB',
    'BYYYYYYYYYYYYYYK',
    'BYKYYYYYYYYYYKYK',
    ...QMARK.map((p) => `BYYY${p.replace(/\./g, 'Y').replace(/q/g, q)}YYYYK`),
    'BYKYYYYYYYYYYKYK',
    'BYYYYYYYYYYYYYYK',
    'KKKKKKKKKKKKKKKK',
  ];
}

const used = [
  'KKKKKKKKKKKKKKKK',
  'KBBBBBBBBBBBBBBK',
  'KBKBBBBBBBBBBKBK',
  ...rep('KBBBBBBBBBBBBBBK', 10),
  'KBKBBBBBBBBBBKBK',
  'KBBBBBBBBBBBBBBK',
  'KKKKKKKKKKKKKKKK',
];

const BRICK_A = [
  'OOOOOOOKOOOOOOOK',
  'OBBBBBBKOBBBBBBK',
  'OBBBBBBKOBBBBBBK',
  'KKKKKKKKKKKKKKKK',
];
const BRICK_B = [
  'OOOKOOOOOOOKOOOO',
  'BBBKOBBBBBBKOBBB',
  'BBBKOBBBBBBKOBBB',
  'KKKKKKKKKKKKKKKK',
];
const brick = [...BRICK_A, ...BRICK_B, ...BRICK_A, ...BRICK_B];

const ground = [
  'OOOOOOOOOKOOOOOB',
  'OBBBBBBBBKOBBBBK',
  'OBBBBBBBBKOBBBBK',
  'OBBBBBBBBKOBBBBK',
  'OBBBBBBBBKKBBBBK',
  'OBBBBBBBBKOOOOOK',
  'OBBBBBBBBKOBBBBK',
  'OBBBBBBBBKOBBBBK',
  'KKBBBBBBKOBBBBBK',
  'OOKKBBBBKOBBBBBK',
  'OBOOKKKKOBBBBBBK',
  'OBBBOOOKOBBBBBBK',
  'OBBBBBBKOBBBBBBK',
  'OBBBBBBKOBBBBBKK',
  'OBBBBBBKOBBBBBBK',
  'BKKKKKKKBKKKKKKK',
];

const stair = [
  'OOOOOOOOOOOOOOOK',
  'OOOOOOOOOOOOOOKK',
  ...rep('OOBBBBBBBBBBBBKK', 12),
  'OKKKKKKKKKKKKKKK',
  'KKKKKKKKKKKKKKKK',
];

// Pipe: pipe_tl+pipe_tr form a 32px lip; pipe_l+pipe_r the body, inset 2px.
const pipe_tl = ['KKKKKKKKKKKKKKKK', ...rep('KGLLLGGGGGGGGGGG', 14), 'KKKKKKKKKKKKKKKK'];
const pipe_tr = ['KKKKKKKKKKKKKKKK', ...rep('GGGGGGGGGGKGGKGK', 14), 'KKKKKKKKKKKKKKKK'];
const pipe_l = rep('..KGLLLGGGGGGGGG', 16);
const pipe_r = rep('GGGGGGGGKGGKGK..', 16);

// ---- coin (8x14, 4-frame spin) ----

const coin1 = [
  '..KKKK..',
  '.KYYYYK.',
  'KYYYYYYK',
  ...rep('KYYOYYOK', 8),
  'KYYYYYOK',
  '.KYOOOK.',
  '..KKKK..',
];
const coin2 = ['..KKKK..', ...rep('..KYOK..', 12), '..KKKK..'];
const coin3 = ['...KK...', ...rep('...YO...', 12), '...KK...'];
const coin4 = ['..KKKK..', ...rep('..KOYK..', 12), '..KKKK..'];

// ---- scenery ----

const CLOUD_LOBES = [[8.5, 10, 5.5], [16, 7.5, 7], [23.5, 10, 5.5]];
const cloudIn = lobes(32, 16, CLOUD_LOBES, [6, 26, 10], 13);
const cloud = shape(32, 16, cloudIn, (x, y) => {
  // light curl under the middle lobe
  const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 6);
  return y >= 9 && y <= 11 && d >= 4.5 && d < 5.5 ? 'S' : 'W';
});

const bushIn = lobes(32, 16, [[8, 11, 6], [16, 8, 7.5], [24, 11, 6]], [4, 28, 11], 15);
const bush = shape(32, 16, bushIn, (x, y) => (!bushIn(x - 1, y - 1) ? 'L' : 'G'));

const HILL_DOTS = new Set(['18,9', '18,10', '29,12', '29,13', '13,19', '13,20', '24,17', '24,18', '34,21', '34,22', '20,25', '20,26']);
const hillIn = (x, y) =>
  x >= 0 && x < 48 && y >= 0 && y < 32 && ((x + 0.5 - 24) / 23.5) ** 2 + ((y + 0.5 - 32) / 31) ** 2 < 1;
const hill = shape(48, 32, hillIn, (x, y) => (HILL_DOTS.has(`${x},${y}`) ? 'K' : 'G'));

// Pennant pointing left, attached along the right edge, white "A" in the body.
const FLAG_A = ['..WW..', '.W..W.', '.W..W.', '.WWWW.', '.W..W.', '.W..W.'];
const flag = Array.from({ length: 16 }, (_, y) => {
  let row = '';
  for (let x = 0; x < 16; x++) {
    const glyph = y >= 5 && y <= 10 && x >= 8 && x <= 13 ? FLAG_A[y - 5][x - 8] : '.';
    if (x < 2 * Math.abs(y + 0.5 - 8)) row += '.';
    else row += glyph === 'W' ? 'W' : 'R';
  }
  return row;
});

const signpost = [
  '................',
  '.KKKKKKKKKKKKKK.',
  '.KBBBBBBBBBBBBK.',
  '.KBOOOOOOOOBBBK.',
  '.KBBBBBBBBBBBBK.',
  '.KBOOOOOBBBBBBK.',
  '.KBBBBBBBBBBBBK.',
  '.KKKKKKKKKKKKKK.',
  ...rep('......KHHK......', 8),
];

export const SPRITES = {
  player_idle, player_run1, player_run2, player_run3, player_jump,
  bug1, bug2, bug_flat,
  qblock1: qblock('O'), qblock2: qblock('W'), qblock3: qblock('O'),
  used, brick, ground, stair,
  pipe_tl, pipe_tr, pipe_l, pipe_r,
  coin1, coin2, coin3, coin4,
  cloud, bush, hill, flag, signpost,
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function bakeSprites() {
  const baked = new Map();
  for (const [name, rows] of Object.entries(SPRITES)) {
    const w = rows[0].length;
    const h = rows.length;
    const img = makeCanvas(w, h);
    const ctx = img.getContext('2d');
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      if (row.length !== w) throw new Error(`sprite ${name}: row ${r} width ${row.length} != ${w}`);
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        if (!Object.hasOwn(PALETTE, ch)) throw new Error(`sprite ${name}: unknown colour ${ch}`);
        ctx.fillStyle = PALETTE[ch];
        ctx.fillRect(x, r, 1, 1);
      }
    }
    const flip = makeCanvas(w, h);
    const fctx = flip.getContext('2d');
    fctx.translate(w, 0);
    fctx.scale(-1, 1);
    fctx.drawImage(img, 0, 0);
    baked.set(name, { img, flip });
  }
  return baked;
}

// Downsample a loaded logo into a 16x16 canvas (smoothing gives the 8-bit look).
export function bakeLogo(img) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const s = Math.min(16 / img.naturalWidth, 16 / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (16 - dw) / 2, (16 - dh) / 2, dw, dh);
  return c;
}
