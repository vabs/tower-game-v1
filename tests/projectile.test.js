import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitTest } from '../src/systems/collision.js';

test('projectile hits enemy within radius', () => {
  const proj = { x: 0, y: 0, radius: 0.5 };
  const enemy = { x: 0.3, y: 0.2 };
  assert.equal(hitTest(proj, enemy), true);
});
