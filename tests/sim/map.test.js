import { test, expect } from 'vitest';
import { maps } from '../../src/data/maps.js';
import { loadMap } from '../../src/sim/map.js';
import { TILE_SIZE } from '../../src/core/grid.js';

const map = loadMap(maps.single_1);

test('map is 20x11', () => {
  expect(map.w).toBe(20);
  expect(map.h).toBe(11);
});

test('every tile on a waypoint segment is unbuildable', () => {
  for (const wps of map.tilePaths) {
    for (let i = 1; i < wps.length; i++) {
      const a = wps[i - 1];
      const b = wps[i];
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      for (let x = a.x, y = a.y; ; x += dx, y += dy) {
        expect(map.buildable(x, y)).toBe(false);
        if (x === b.x && y === b.y) break;
      }
    }
  }
});

test('spawn and goal are at path ends', () => {
  const p = map.paths[0];
  expect(p[0]).toEqual({ x: map.spawn.x * TILE_SIZE + 24, y: map.spawn.y * TILE_SIZE + 24 });
  expect(p[p.length - 1]).toEqual({ x: map.goal.x * TILE_SIZE + 24, y: map.goal.y * TILE_SIZE + 24 });
  expect(map.kind(map.spawn.x, map.spawn.y)).toBe('spawn');
  expect(map.kind(map.goal.x, map.goal.y)).toBe('goal');
});

test('out of bounds and blocked tiles are not buildable', () => {
  expect(map.buildable(-1, 0)).toBe(false);
  expect(map.buildable(20, 0)).toBe(false);
  expect(map.buildable(0, 11)).toBe(false);
  expect(map.buildable(2, 0)).toBe(false); // '#'
  expect(map.buildable(0, 0)).toBe(true);
});

test('path is long enough for ~20s at speed 1.0', () => {
  const tiles = map.pathLengths[0] / TILE_SIZE;
  expect(tiles / 1.5).toBeGreaterThan(18);
  expect(tiles / 1.5).toBeLessThan(26);
});

test('malformed templates throw', () => {
  expect(() => loadMap({ id: 'x', grid: ['S.G', '..'], paths: [[{ x: 0, y: 0 }]] })).toThrow();
  expect(() => loadMap({ id: 'x', grid: ['S#G'], paths: [[{ x: 0, y: 0 }, { x: 2, y: 0 }]] })).toThrow();
});
