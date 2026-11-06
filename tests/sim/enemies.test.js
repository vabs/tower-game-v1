import { test, expect } from 'vitest';
import { createWorld, step, STEP, STARTING_HP } from '../../src/sim/world.js';
import { spawnEnemy, leakDamage } from '../../src/sim/enemies.js';
import { TILE_SIZE } from '../../src/core/grid.js';

function runUntilGone(world, enemy, cap = 120) {
  let t = 0;
  while (world.enemies.includes(enemy) && t < cap) {
    step(world, STEP);
    t += STEP;
  }
  return t;
}

test('grunt (speed 1.0) reaches goal in about length / 1.5 tiles per s', () => {
  const w = createWorld(1);
  const e = spawnEnemy(w, 'grunt');
  const expected = w.map.pathLengths[0] / (1.5 * TILE_SIZE);
  const t = runUntilGone(w, e);
  expect(t).toBeGreaterThan(expected - 0.1);
  expect(t).toBeLessThan(expected + 0.1);
  expect(t).toBeGreaterThan(18);
  expect(t).toBeLessThan(26);
});

test('runner is faster than grunt', () => {
  const w = createWorld(1);
  const e = spawnEnemy(w, 'runner');
  const t = runUntilGone(w, e);
  expect(t).toBeLessThan(15);
});

test('leak damage tiers', () => {
  expect(leakDamage(50)).toBe(1);
  expect(leakDamage(99)).toBe(1);
  expect(leakDamage(100)).toBe(2);
  expect(leakDamage(199)).toBe(2);
  expect(leakDamage(200)).toBe(3);
  expect(leakDamage(300)).toBe(4);
  expect(leakDamage(420)).toBe(5);
});

test('a leaking grunt costs 1 hp and emits a leak event', () => {
  const w = createWorld(1);
  const e = spawnEnemy(w, 'grunt');
  runUntilGone(w, e);
  expect(w.hp).toBe(STARTING_HP - 1);
  expect(w.events.filter((ev) => ev.type === 'leak')).toHaveLength(1);
});

test('a leaking tank costs 4 hp', () => {
  const w = createWorld(1);
  const e = spawnEnemy(w, 'tank');
  runUntilGone(w, e);
  expect(w.hp).toBe(STARTING_HP - 4);
});

test('air units fly a straight line to the goal', () => {
  const w = createWorld(1);
  const e = spawnEnemy(w, 'drone');
  const direct = Math.hypot(e.path[1].x - e.path[0].x, e.path[1].y - e.path[0].y);
  expect(e.length).toBeCloseTo(direct);
  expect(e.length).toBeLessThan(w.map.pathLengths[0]);
});

test('hp reaching 0 sets phase lost', () => {
  const w = createWorld(1);
  w.hp = 1;
  const e = spawnEnemy(w, 'grunt');
  runUntilGone(w, e);
  expect(w.hp).toBe(0);
  expect(w.phase).toBe('lost');
});

test('stepping a finished world is a no-op', () => {
  const w = createWorld(1);
  w.phase = 'won';
  const t = w.time;
  step(w, STEP);
  expect(w.time).toBe(t);
});
