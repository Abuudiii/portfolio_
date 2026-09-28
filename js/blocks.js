// Block ids and per-face tile definitions. Pure module (no DOM, no three).

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, PLANKS: 5, LOG: 6, LEAVES: 7,
  GLASS: 8, BRICKS: 9, GRAVEL: 10, BEDROCK: 11, IRON: 12, GOLD: 13, BLACK: 14,
  WHITE: 15, CHEST: 16, CRAFTING: 17, SIGN: 18, BED: 19, STONE_BRICK: 20,
  WALL0: 21, WALL1: 22, WALL2: 23, WALL3: 24, WALL4: 25,
};

const all = (name, tile, transparent = false) =>
  ({ name, tiles: { top: tile, bottom: tile, side: tile }, transparent });

// Indexed by block id; `front` overrides `side` on the -z face only.
export const BLOCKS = [];
BLOCKS[B.AIR] = { name: 'air', tiles: null, transparent: true };
BLOCKS[B.GRASS] = { name: 'grass', tiles: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, transparent: false };
BLOCKS[B.DIRT] = all('dirt', 'dirt');
BLOCKS[B.STONE] = all('stone', 'stone');
BLOCKS[B.COBBLE] = all('cobble', 'cobble');
BLOCKS[B.PLANKS] = all('planks', 'planks');
BLOCKS[B.LOG] = { name: 'log', tiles: { top: 'log_top', bottom: 'log_top', side: 'log_side' }, transparent: false };
BLOCKS[B.LEAVES] = all('leaves', 'leaves', true);
BLOCKS[B.GLASS] = all('glass', 'glass', true);
BLOCKS[B.BRICKS] = all('bricks', 'bricks');
BLOCKS[B.GRAVEL] = all('gravel', 'gravel');
BLOCKS[B.BEDROCK] = all('bedrock', 'bedrock');
BLOCKS[B.IRON] = all('iron', 'iron');
BLOCKS[B.GOLD] = all('gold', 'gold');
BLOCKS[B.BLACK] = all('black', 'black');
BLOCKS[B.WHITE] = all('white', 'white');
BLOCKS[B.CHEST] = { name: 'chest', tiles: { top: 'chest_top', bottom: 'chest_top', side: 'chest_side', front: 'chest_front' }, transparent: false };
BLOCKS[B.CRAFTING] = { name: 'crafting', tiles: { top: 'crafting_top', bottom: 'planks', side: 'crafting_side' }, transparent: false };
BLOCKS[B.SIGN] = all('sign', 'sign');
BLOCKS[B.BED] = { name: 'bed', tiles: { top: 'bed_top', bottom: 'planks', side: 'bed_side' }, transparent: false };
BLOCKS[B.STONE_BRICK] = all('stone_brick', 'stone_brick');
for (let i = 0; i < 5; i++) BLOCKS[B.WALL0 + i] = all(`wall${i}`, `wall${i}`);

export const isOpaque = (id) => id !== B.AIR && !BLOCKS[id].transparent;

export const HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.GLASS, B.BRICKS, B.GOLD];
