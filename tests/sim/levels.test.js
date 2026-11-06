import { test, expect } from 'vitest';
import { levels } from '../../src/data/levels.js';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { startWave } from '../../src/sim/commands.js';

test.each(levels.map((l) => l.id))('level %i runs 30 sim-seconds headless with no towers', (n) => {
  const w = createWorld(n, { seed: 1 });
  w.hp = w.maxHp = 1e6; // survive leaks so the sim keeps running
  expect(startWave(w).ok).toBe(true);
  let sawEnemy = false;
  for (let i = 0; i < 30 / STEP; i++) {
    step(w, STEP);
    if (w.enemies.length > 0) sawEnemy = true;
  }
  const leaked = w.events.some((e) => e.type === 'leak');
  const supplyOnly = w.waves[0].supply === true;
  expect(sawEnemy || leaked || supplyOnly).toBe(true);
  for (const e of w.enemies) {
    expect(Number.isFinite(e.x) && Number.isFinite(e.y)).toBe(true);
    expect(e.hp).toBeGreaterThan(0);
  }
});
