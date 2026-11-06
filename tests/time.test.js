import { test } from 'vitest';
import assert from 'node:assert/strict';
import { stepFixed, createClock } from '../src/core/time.js';

test('fixed step yields expected ticks', () => {
  assert.equal(stepFixed(0.1, 0.05), 2);
});

test('clock carries remainder across calls', () => {
  const clock = createClock(1 / 60);
  let steps = 0;
  for (let i = 0; i < 10; i++) steps += clock.advance(1 / 120);
  assert.equal(steps, 5);
});

test('clock clamps large dt to 0.25s', () => {
  const clock = createClock(1 / 60);
  assert.equal(clock.advance(1), 15);
});

test('clock returns 0 for dt smaller than a step', () => {
  const clock = createClock(0.1);
  assert.equal(clock.advance(0.05), 0);
  assert.equal(clock.advance(0.05), 1);
});
