import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTarget } from '../src/systems/targeting.js';

test('selects closest enemy in range', () => {
  const tower = { x: 0, y: 0, range: 5 };
  const enemies = [{ id: 1, x: 3, y: 0 }, { id: 2, x: 4, y: 0 }];
  const t = selectTarget(tower, enemies, 'closest');
  assert.equal(t.id, 1);
});
