import { test, expect } from 'vitest';
import { maps, mapIdForLevel } from '../../src/data/maps.js';
import { levels } from '../../src/data/levels.js';
import { loadMap, validateMap } from '../../src/sim/map.js';
import { createWorld } from '../../src/sim/world.js';
import { spawnEnemy } from '../../src/sim/enemies.js';
import { TILE_SIZE } from '../../src/core/grid.js';

const ids = Object.keys(maps);
const TYPES = ['single', 'branching', 'open', 'split', 'hybrid'];

test('15 templates: 3 of each type', () => {
  expect(ids).toHaveLength(15);
  for (const t of TYPES) for (const n of [1, 2, 3]) expect(maps[`${t}_${n}`]?.type).toBe(t);
});

test.each(ids)('%s validates and loads', (id) => {
  const t = maps[id];
  expect(validateMap(t)).toEqual([]);
  const m = loadMap(t);
  expect(m.w).toBe(20);
  expect(m.h).toBe(11);
  const flat = m.tiles.flat();
  expect(flat.filter((k) => k === 'buildable').length).toBeGreaterThanOrEqual(30);
  expect(flat.filter((k) => k === 'blocked').length).toBeGreaterThanOrEqual(4);
  for (const len of m.pathLengths) {
    const tiles = len / TILE_SIZE;
    expect(tiles).toBeGreaterThanOrEqual(28);
    expect(tiles).toBeLessThanOrEqual(45);
  }
});

test('path-count and spawn-count match type', () => {
  for (const id of ids) {
    const m = loadMap(maps[id]);
    if (m.pick === 'first') expect(m.paths).toHaveLength(1);
    if (maps[id].type === 'branching') {
      expect(m.spawns).toHaveLength(1);
      expect(m.paths.length).toBeGreaterThanOrEqual(2);
      expect(m.pick).toBe('random');
    }
    if (maps[id].type === 'split') {
      expect(m.spawns).toHaveLength(2);
      expect(m.pick).toBe('alternate');
    }
    if (maps[id].type === 'hybrid') expect(m.spawns.length).toBeGreaterThanOrEqual(2);
  }
});

test('validateMap reports problems', () => {
  const base = maps.single_1;
  expect(validateMap({ ...base, paths: [[{ x: 1, y: 2 }, { x: 14, y: 8 }]] }).length).toBeGreaterThan(0);
  expect(validateMap({ ...base, paths: [[{ x: 0, y: 2 }, { x: 14, y: 8 }]] }).length).toBeGreaterThan(0); // diagonal
  expect(validateMap({ ...base, paths: [[{ x: 0, y: 2 }, { x: 5, y: 2 }]] }).length).toBeGreaterThan(0); // no G
  const g = base.grid.slice();
  g[2] = 'S.#................';
  expect(validateMap({ ...base, grid: g }).length).toBeGreaterThan(0); // blocked on path
});

test('mapIdForLevel is valid for all 50 levels and follows the formula', () => {
  for (const lv of levels) {
    const id = mapIdForLevel(lv.id);
    expect(id).toBe(`${lv.mapType}_${((lv.id - 1) % 3) + 1}`);
    expect(maps[id]).toBeDefined();
  }
});

test('unknown level/type falls back to single_1 with a warning', () => {
  const orig = console.warn;
  let warned = 0;
  console.warn = () => warned++;
  try {
    expect(mapIdForLevel(999)).toBe('single_1');
  } finally {
    console.warn = orig;
  }
  expect(warned).toBe(1);
});

function worldOnMap(id) {
  const w = createWorld(1, { seed: 3 });
  w.map = loadMap(maps[id]);
  return w;
}

test('split/hybrid maps alternate paths; air starts at the chosen spawn', () => {
  const w = worldOnMap('split_1');
  const a = spawnEnemy(w, 'grunt');
  const b = spawnEnemy(w, 'grunt');
  const c = spawnEnemy(w, 'grunt');
  expect([a.pathIndex, b.pathIndex, c.pathIndex]).toEqual([0, 1, 0]);
  const air = spawnEnemy(w, 'drone'); // pathIndex 1 -> second spawn
  expect(air.path).toHaveLength(2);
  expect(air.path[0]).toEqual(w.map.paths[1][0]);
  expect(air.path[1]).toEqual(w.map.paths[1][w.map.paths[1].length - 1]);
});

test('branching picks from the seeded rng and uses every branch', () => {
  const run = () => {
    const w = worldOnMap('branching_1');
    return Array.from({ length: 30 }, () => spawnEnemy(w, 'grunt').pathIndex);
  };
  const r = run();
  expect(r).toEqual(run());
  expect(new Set(r)).toEqual(new Set([0, 1]));
});
