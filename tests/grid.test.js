import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTile, toWorld } from '../src/core/grid.js';

test('grid conversions are reversible', () => {
  const tile = { x: 3, y: 5 };
  const world = toWorld(tile, 16);
  const back = toTile(world, 16);
  assert.deepEqual(back, tile);
});
