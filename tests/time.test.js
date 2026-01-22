import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepFixed } from '../src/core/time.js';

test('fixed step yields expected ticks', () => {
  const ticks = stepFixed(0.1, 0.05);
  assert.equal(ticks, 2);
});
