import { test, expect } from 'vitest';
import { createSandboxWorld, spawnTestWave } from '../../src/sim/sandbox.js';
import { towers } from '../../src/data/towers.js';
import { run } from './helpers.js';

test('sandbox world unlocks all 30 towers with lots of coins', () => {
  const w = createSandboxWorld();
  expect(w.unlocked).toHaveLength(30);
  expect(w.unlocked).toHaveLength(towers.length);
  expect(w.coins).toBe(99999);
});

test('test wave spawns 5 grunts, 3 drones and 1 tank and runs without error', () => {
  const w = createSandboxWorld();
  const made = spawnTestWave(w);
  expect(made.map((e) => e.defId).sort()).toEqual([...Array(3).fill('drone'), ...Array(5).fill('grunt'), 'tank'].sort());
  run(w, 3);
});
