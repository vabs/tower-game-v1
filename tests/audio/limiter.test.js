import { test, expect } from 'vitest';
import { createVoiceLimiter } from '../../src/audio/limiter.js';

test('minimum retrigger interval', () => {
  const l = createVoiceLimiter({ minInterval: 0.05, max: 10 });
  expect(l.tryAcquire('a', 0, 0.1)).toBe(true);
  expect(l.tryAcquire('a', 0.03, 0.1)).toBe(false);
  expect(l.tryAcquire('a', 0.05, 0.1)).toBe(true);
  expect(l.tryAcquire('b', 0.05, 0.1)).toBe(true); // other sounds are independent
});

test('per-sound voice cap frees up as voices end', () => {
  const l = createVoiceLimiter({ minInterval: 0, max: 2 });
  expect(l.tryAcquire('a', 0, 1)).toBe(true);
  expect(l.tryAcquire('a', 0.1, 1)).toBe(true);
  expect(l.tryAcquire('a', 0.2, 1)).toBe(false);
  expect(l.tryAcquire('a', 1.05, 1)).toBe(true);
});

test('global cap, with priority sounds exempt', () => {
  const l = createVoiceLimiter({ minInterval: 0, max: 10, globalMax: 3, perSound: { alarm: { priority: true, max: 2 } } });
  expect(l.tryAcquire('a', 0, 5)).toBe(true);
  expect(l.tryAcquire('b', 0, 5)).toBe(true);
  expect(l.tryAcquire('c', 0, 5)).toBe(true);
  expect(l.tryAcquire('d', 0, 5)).toBe(false);
  expect(l.tryAcquire('alarm', 0, 5)).toBe(true);
  expect(l.tryAcquire('alarm', 0.1, 5)).toBe(true);
  expect(l.tryAcquire('alarm', 0.2, 5)).toBe(false); // still bound by its own cap
  expect(l.active(0.3)).toBe(5);
});

test('a 30-tower burst is bounded', () => {
  const l = createVoiceLimiter({ minInterval: 0.05, max: 4, globalMax: 24 });
  let ok = 0;
  for (let i = 0; i < 300; i++) if (l.tryAcquire('fire', i * 0.001, 0.06)) ok++; // 300 events in 0.3 s
  expect(ok).toBeLessThanOrEqual(7);
  expect(ok).toBeGreaterThan(0);
});

test('reset clears state', () => {
  const l = createVoiceLimiter({ minInterval: 1 });
  l.tryAcquire('a', 0, 1);
  l.reset();
  expect(l.tryAcquire('a', 0.1, 1)).toBe(true);
});
