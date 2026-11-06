import { test, expect } from 'vitest';
import { step, STEP } from '../../src/sim/world.js';
import { applySlow, applyBurn, applyStun, speedMultiplier, updateEffects, addGasField } from '../../src/sim/effects.js';
import { setTargeting } from '../../src/sim/commands.js';
import { sandbox, place, enemyAt, run, runUntilEvent } from './helpers.js';

test('slow: strongest wins, never stacks, expires', () => {
  const w = sandbox();
  const e = enemyAt(w, 'grunt', 100, { frozen: false });
  applySlow(e, 0.2, 2);
  applySlow(e, 0.1, 5); // weaker: ignored, duration not extended
  expect(e.status.slow).toEqual({ factor: 0.2, remaining: 2 });
  applySlow(e, 0.3, 1); // stronger replaces
  expect(e.status.slow).toEqual({ factor: 0.3, remaining: 1 });
  expect(speedMultiplier(e)).toBeCloseTo(0.7, 5);
  const d0 = e.distance;
  run(w, 0.5);
  expect(e.distance - d0).toBeCloseTo(0.7 * 1.0 * 1.5 * 48 * 0.5, 0);
  run(w, 0.6);
  expect(e.status.slow).toBeUndefined();
  expect(speedMultiplier(e)).toBe(1);
});

test('cryo sprayer hit applies its slow', () => {
  const w = sandbox();
  place(w, 'cryo_sprayer', 6, 3);
  const e = enemyAt(w, 'tank', 250);
  run(w, 0.5);
  expect(e.status.slow?.factor).toBe(0.2);
});

test('burn deals dps x duration in total, then ends; stronger burn replaces', () => {
  const w = sandbox();
  const e = enemyAt(w, 'tank', 100);
  e.hp = e.maxHp = 1000;
  applyBurn(e, 10, 2, null);
  applyBurn(e, 4, 9, null);
  expect(e.status.burn.dps).toBe(10);
  run(w, 3);
  expect(1000 - e.hp).toBeCloseTo(20, 1);
  expect(e.status.burn).toBeUndefined();
});

test('incendiary turret sets enemies on fire', () => {
  const w = sandbox();
  place(w, 'incendiary_turret', 6, 3);
  const e = enemyAt(w, 'tank', 250);
  run(w, 0.5);
  expect(e.status.burn).toBeDefined();
});

test('stun stops movement for its duration, then movement resumes', () => {
  const w = sandbox();
  const e = enemyAt(w, 'grunt', 100, { frozen: false });
  applyStun(e, 0.5);
  const d0 = e.distance;
  run(w, 0.4);
  expect(e.distance).toBe(d0);
  run(w, 0.3);
  expect(e.status.stun).toBeUndefined();
  expect(e.distance).toBeGreaterThan(d0);
});

test('EMP node stuns on hit', () => {
  const w = sandbox();
  place(w, 'emp_node', 6, 3);
  const e = enemyAt(w, 'tank', 250);
  expect(runUntilEvent(w, 'hit')).toBe(true);
  expect(e.status.stun.remaining).toBeGreaterThan(0);
});

test('shock coil chains to 1 + chains enemies, nearest first, each slowed', () => {
  const w = sandbox();
  const t = place(w, 'shock_coil', 6, 3); // L1: chains 2, 2-tile hops
  setTargeting(w, t.id, 'last');
  const es = [230, 270, 310, 350, 390].map((d) => enemyAt(w, 'tank', d)); // 40 px apart
  step(w, STEP);
  const hit = es.filter((e) => e.hp < e.maxHp);
  expect(hit).toEqual(es.slice(0, 3));
  for (const e of hit) expect(e.status.slow.factor).toBe(0.15);
  expect(es[3].status.slow).toBeUndefined();
  const ev = w.events.find((x) => x.type === 'chain');
  expect(ev.points).toHaveLength(4); // tower + 3 enemies
});

test('shock coil does not hop to enemies farther than 2 tiles', () => {
  const w = sandbox();
  const t = place(w, 'shock_coil', 6, 3);
  setTargeting(w, t.id, 'last');
  const [a, b] = [230, 340].map((d) => enemyAt(w, 'tank', d)); // 110 px apart > 96
  step(w, STEP);
  expect(a.hp).toBeLessThan(a.maxHp);
  expect(b.hp).toBe(b.maxHp);
});

test('gas field slows and damages only enemies inside it, ground only, then expires', () => {
  const w = sandbox();
  const t = place(w, 'gas_projector', 6, 3);
  const lv = t.def.levels[0];
  const inside = enemyAt(w, 'tank', 250);
  const outside = enemyAt(w, 'tank', 250 + 150); // radius is 72 px
  const f = addGasField(w, t, inside.x, inside.y, lv);
  const air = enemyAt(w, 'drone', 100);
  air.x = inside.x; air.y = inside.y;
  updateEffects(w, STEP);
  expect(inside.status.slow.factor).toBe(0.12);
  expect(inside.hp).toBeLessThan(inside.maxHp);
  expect(outside.status.slow).toBeUndefined();
  expect(outside.hp).toBe(outside.maxHp);
  expect(air.status.slow).toBeUndefined();
  expect(air.hp).toBe(air.maxHp);
  f.remaining = STEP / 2;
  updateEffects(w, STEP);
  expect(w.fields).toHaveLength(0);
});

test('gas projector tower creates a field near its target and refreshes instead of stacking', () => {
  const w = sandbox();
  place(w, 'gas_projector', 6, 3);
  enemyAt(w, 'tank', 250);
  run(w, 2);
  expect(w.fields).toHaveLength(1);
});
