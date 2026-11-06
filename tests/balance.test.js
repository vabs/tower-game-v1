import { test, expect } from 'vitest';
import { runBot } from '../tools/balance-bot.js';

// Regression guard for the tuning: the greedy balance bot must clear the early campaign and
// the first boss level, deterministically, with some HP to spare.
test.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20])('balance bot wins level %i', (level) => {
  const r = runBot(level, 1);
  expect(r.won).toBe(true);
  expect(r.hp).toBeGreaterThan(0);
});

test('balance bot is deterministic per seed', () => {
  const a = runBot(5, 3);
  const b = runBot(5, 3);
  expect([a.hp, a.seconds, a.coinsLeft]).toEqual([b.hp, b.seconds, b.coinsLeft]);
});
