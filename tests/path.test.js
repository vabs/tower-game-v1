import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathLength, positionAt } from '../src/core/path.js';

test('path length and position', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  assert.equal(pathLength(pts), 20);
  assert.deepEqual(positionAt(pts, 5), { x: 5, y: 0 });
  assert.deepEqual(positionAt(pts, 15), { x: 10, y: 5 });
});
