import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Enemy } from '../src/entities/enemy.js';
import { applySlow } from '../src/systems/status.js';

test('slow reduces speed temporarily', () => {
  const e = new Enemy({ hp: 100, speed: 1, path: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
  applySlow(e, 0.5, 1.0);
  e.update(1.0);
  assert.ok(e.speedMultiplier < 1);
  e.update(1.0);
  assert.equal(e.speedMultiplier, 1);
});
