import { test, expect } from 'vitest';
import { runBot, HUMAN_PROFILE } from '../tools/balance-bot.js';

// Regression guard for the human-proxy tuning (build-phase buying only, ~70% placements, "first"
// targeting): representative levels from each chapter, including the ones that used to be 0% wins.
test.each([1, 11, 19, 25, 31])('human proxy wins level %i on seeds 1-3 (Regular)', (level) => {
  for (const seed of [1, 2, 3]) {
    const r = runBot(level, seed, HUMAN_PROFILE);
    expect(r.won, `L${level} seed ${seed}`).toBe(true);
    expect(r.hp / r.maxHp).toBeGreaterThanOrEqual(0.2);
  }
}, 30000);

test('human proxy is deterministic per seed and never acts mid-wave', () => {
  const a = runBot(7, 2, HUMAN_PROFILE);
  const b = runBot(7, 2, HUMAN_PROFILE);
  expect([a.hp, a.seconds, a.coinsLeft, a.towers]).toEqual([b.hp, b.seconds, b.coinsLeft, b.towers]);
});

test('the placement option degrades placements without touching the sim rng', () => {
  const best = runBot(4, 1);
  const worse = runBot(4, 1, { placement: 0.7 });
  expect(best.won && worse.won).toBe(true);
  expect(worse.towers).toBeGreaterThan(0);
});

test('difficulty is a real world option: Recruit makes the proxy comfortably win', () => {
  for (const seed of [1, 2, 3]) {
    const r = runBot(11, seed, { ...HUMAN_PROFILE, difficulty: 'recruit' });
    expect(r.won).toBe(true);
    expect(r.hp / r.maxHp).toBeGreaterThanOrEqual(0.4);
  }
}, 30000);
