import { test, expect } from 'vitest';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { placeTower, startWave } from '../../src/sim/commands.js';

const CAP = 10 * 60;

function play(world, plan) {
  const pending = [...plan];
  while (world.phase !== 'won' && world.phase !== 'lost' && world.time < CAP) {
    for (let i = pending.length - 1; i >= 0; i--) {
      if (placeTower(world, 'ar_turret', pending[i][0], pending[i][1]).ok) pending.splice(i, 1);
    }
    if (world.phase === 'build' && world.waveIndex === 0) startWave(world);
    step(world, STEP);
  }
}

test('level 1: 3 AR Turrets beat all waves with hp left', () => {
  const w = createWorld(1, { seed: 42 });
  play(w, [[6, 3], [9, 4], [5, 7]]);
  expect(w.phase).toBe('won');
  expect(w.hp).toBeGreaterThanOrEqual(15); // gentle: 3 ARs lose only a few HP
  expect(w.waveIndex).toBe(4);
  expect(w.towers).toHaveLength(3);
});

test('level 1: identical seeds give identical outcomes', () => {
  const a = createWorld(1, { seed: 7 });
  const b = createWorld(1, { seed: 7 });
  play(a, [[6, 3], [9, 4], [5, 7]]);
  play(b, [[6, 3], [9, 4], [5, 7]]);
  expect([a.hp, a.coins, a.time]).toEqual([b.hp, b.coins, b.time]);
});

test('level 1 with 2 ARs is still winnable', () => {
  const w = createWorld(1, { seed: 42 });
  play(w, [[6, 3], [9, 4]]);
  expect(w.phase).toBe('won');
});

test('level 1 with no towers: starting hp is not enough -> lost', () => {
  const w = createWorld(1, { seed: 1 });
  play(w, []);
  expect(w.phase).toBe('lost');
  expect(w.hp).toBe(0);
});

test('level 1 with no towers but huge hp: every enemy leaks for 1 hp (38 enemies)', () => {
  const w = createWorld(1, { seed: 1 });
  w.hp = w.maxHp = 1000;
  play(w, []);
  expect(w.phase).toBe('won');
  expect(w.hp).toBe(1000 - 38);
});
