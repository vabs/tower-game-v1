import { test, expect } from 'vitest';
import { createWorld, step, STEP, STARTING_HP, WAVE_COUNTDOWN } from '../../src/sim/world.js';
import { startWave } from '../../src/sim/commands.js';
import { buildWaves } from '../../src/data/waves.js';
import { buildSpawnQueue } from '../../src/sim/spawner.js';
import { stipendForLevel } from '../../src/systems/economy.js';

function runUntil(world, pred, cap = 600) {
  let t = 0;
  while (!pred(world) && t < cap) {
    step(world, STEP);
    t += STEP;
  }
  return t;
}

test('level 1 has 3 waves of grunts/runners', () => {
  const waves = buildWaves(1);
  expect(waves).toHaveLength(3);
  for (const w of waves) for (const g of w.enemies) expect(['grunt', 'runner']).toContain(g.id);
});

test('spawn queue has the right counts and ordering', () => {
  const wave = buildWaves(1)[1];
  const q = buildSpawnQueue(wave);
  expect(q.filter((e) => e.id === 'grunt')).toHaveLength(8);
  expect(q.filter((e) => e.id === 'runner')).toHaveLength(4);
  for (let i = 1; i < q.length; i++) expect(q[i].t).toBeGreaterThan(q[i - 1].t);
});

test('startWave works in build phase, not during a wave', () => {
  const w = createWorld(1);
  expect(startWave(w)).toMatchObject({ ok: true });
  expect(w.phase).toBe('wave');
  expect(startWave(w)).toEqual({ ok: false, reason: 'wrong_phase' });
});

test('wave spawns the expected number of enemies', () => {
  const w = createWorld(1);
  startWave(w);
  let spawned = 0;
  const seen = new Set();
  runUntil(w, (x) => {
    x.enemies.forEach((e) => seen.add(e.id));
    return x.phase !== 'wave';
  });
  spawned = seen.size;
  expect(spawned).toBe(8);
});

test('stipend is paid once per wave and wave ends only when field is clear', () => {
  const w = createWorld(1);
  const coins0 = w.coins;
  startWave(w);
  runUntil(w, (x) => x.phase !== 'wave');
  expect(w.phase).toBe('build');
  expect(w.waveIndex).toBe(1);
  expect(w.coins).toBe(coins0 + stipendForLevel(1));
  expect(w.events.filter((e) => e.type === 'waveEnd')).toHaveLength(1);
  // stepping more in build phase does not pay again
  for (let i = 0; i < 60; i++) step(w, STEP);
  expect(w.coins).toBe(coins0 + stipendForLevel(1));
});

test('countdown auto-starts the next wave after the first', () => {
  const w = createWorld(1);
  startWave(w);
  runUntil(w, (x) => x.phase !== 'wave');
  expect(w.countdown).toBeCloseTo(WAVE_COUNTDOWN);
  const t = runUntil(w, (x) => x.phase === 'wave');
  expect(t).toBeGreaterThan(WAVE_COUNTDOWN - 0.1);
  expect(t).toBeLessThan(WAVE_COUNTDOWN + 0.1);
  expect(w.waveIndex).toBe(1);
});

test('first wave never auto-starts', () => {
  const w = createWorld(1);
  for (let i = 0; i < 60 * 30; i++) step(w, STEP);
  expect(w.phase).toBe('build');
});

test('calling the next wave early pays a bonus and cancels countdown', () => {
  const w = createWorld(1);
  startWave(w);
  runUntil(w, (x) => x.phase !== 'wave');
  const before = w.coins;
  const r = startWave(w);
  expect(r.ok).toBe(true);
  expect(r.bonus).toBe(5);
  expect(w.coins).toBe(before + 5);
  expect(w.countdown).toBe(null);
});

test('with no towers all waves leak -> hp reduced, then won if hp survives', () => {
  const w = createWorld(1);
  startWave(w);
  runUntil(w, (x) => x.phase === 'won' || x.phase === 'lost');
  const total = 8 + 12 + 18;
  expect(STARTING_HP - w.hp).toBe(total); // all 1-damage enemies
  expect(w.phase).toBe('won');
});

test('lost when hp hits zero', () => {
  const w = createWorld(1);
  w.hp = 5;
  startWave(w);
  runUntil(w, (x) => x.phase === 'lost');
  expect(w.phase).toBe('lost');
  expect(w.hp).toBe(0);
  expect(w.events.some((e) => e.type === 'levelEnd' && e.result === 'lost')).toBe(true);
});
