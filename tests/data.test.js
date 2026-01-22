import { test } from 'node:test';
import assert from 'node:assert/strict';
import { towers } from '../src/data/towers.js';
import { enemies } from '../src/data/enemies.js';
import { levels } from '../src/data/levels.js';

test('data counts match spec', () => {
  assert.equal(towers.length, 30);
  assert.equal(enemies.length, 20);
  assert.equal(levels.length, 50);
});
