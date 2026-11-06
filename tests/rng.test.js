import { test, expect } from 'vitest';
import { createRng } from '../src/core/rng.js';

test('same seed yields same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  const sa = Array.from({ length: 10 }, () => a.next());
  const sb = Array.from({ length: 10 }, () => b.next());
  expect(sa).toEqual(sb);
});

test('different seeds diverge', () => {
  expect(createRng(1).next()).not.toBe(createRng(2).next());
});

test('next is in [0,1) and int(n) in [0,n)', () => {
  const r = createRng(7);
  for (let i = 0; i < 200; i++) {
    const v = r.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    const n = r.int(5);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(5);
  }
});

test('chance respects extremes', () => {
  const r = createRng(3);
  for (let i = 0; i < 50; i++) {
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  }
});
