import { test, expect } from 'vitest';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { spawnEnemy } from '../../src/sim/enemies.js';
import { applyDamage } from '../../src/sim/damage.js';
import { escortPlan, ESCORT_MIN, ESCORT_MAX, ENRAGE_SPEED } from '../../src/sim/bossPhases.js';

function bossWorld(level, bossId) {
  const w = createWorld(level);
  const b = spawnEnemy(w, bossId);
  b.distance = 300;
  return { w, b };
}
const hit = (w, e, toFraction) => applyDamage(w, e, e.hp - e.maxHp * toFraction, 0);
const phases = (w) => w.events.filter((e) => e.type === 'bossPhase');

test('ground boss below 50% calls 4-6 ground escorts with ~10% of its max HP at its position', () => {
  const { w, b } = bossWorld(10, 'heavy_boss');
  step(w, STEP);
  expect(phases(w)).toHaveLength(0);
  hit(w, b, 0.49);
  const before = w.enemies.length;
  step(w, STEP);
  const ev = phases(w);
  expect(ev).toHaveLength(1);
  expect(ev[0].phase).toBe('escorts');
  const escorts = w.enemies.filter((e) => !e.boss);
  expect(w.enemies.length - before).toBe(escorts.length);
  expect(escorts.length).toBeGreaterThanOrEqual(ESCORT_MIN);
  expect(escorts.length).toBeLessThanOrEqual(ESCORT_MAX);
  expect(escorts.every((e) => !e.air && e.pathIndex === b.pathIndex)).toBe(true);
  expect(escorts.every((e) => e.distance <= b.distance + 1)).toBe(true);
  const total = escorts.reduce((a, e) => a + e.maxHp, 0);
  expect(total).toBeCloseTo(b.maxHp * 0.1, 5);
});

test('air boss calls air escorts', () => {
  const { w, b } = bossWorld(20, 'sky_tank_boss');
  hit(w, b, 0.4);
  step(w, STEP);
  const escorts = w.enemies.filter((e) => !e.boss);
  expect(escorts.length).toBeGreaterThanOrEqual(ESCORT_MIN);
  expect(escorts.every((e) => e.air)).toBe(true);
});

test('escorts are called once only', () => {
  const { w, b } = bossWorld(10, 'heavy_boss');
  hit(w, b, 0.4);
  step(w, STEP);
  const n = w.enemies.length;
  for (let i = 0; i < 30; i++) step(w, STEP);
  expect(w.enemies.length).toBe(n);
  expect(phases(w).filter((e) => e.phase === 'escorts')).toHaveLength(1);
});

test('boss enrages below 25% for +20% speed, once', () => {
  const { w, b } = bossWorld(10, 'heavy_boss');
  const v0 = b.speed;
  hit(w, b, 0.2);
  step(w, STEP);
  expect(b.enraged).toBe(true);
  expect(b.speed).toBeCloseTo(v0 * ENRAGE_SPEED, 9);
  expect(phases(w).map((e) => e.phase).sort()).toEqual(['enrage', 'escorts']);
  for (let i = 0; i < 10; i++) step(w, STEP);
  expect(b.speed).toBeCloseTo(v0 * ENRAGE_SPEED, 9);
});

test('a dead boss triggers nothing', () => {
  const { w, b } = bossWorld(10, 'heavy_boss');
  applyDamage(w, b, b.hp + 1, 0);
  step(w, STEP);
  expect(phases(w)).toHaveLength(0);
});

test('escortPlan is deterministic and respects the count bounds on every boss level', () => {
  for (const [level, id] of [[10, 'heavy_boss'], [20, 'sky_tank_boss'], [30, 'tank_boss'], [40, 'bulldozer_boss'], [50, 'sky_tank_boss']]) {
    const { b } = bossWorld(level, id);
    const a = escortPlan(level, b);
    expect(a).toEqual(escortPlan(level, b));
    expect(a.count).toBeGreaterThanOrEqual(ESCORT_MIN);
    expect(a.count).toBeLessThanOrEqual(ESCORT_MAX);
    expect(a.hp * a.count).toBeCloseTo(b.maxHp * 0.1, 5);
  }
});
