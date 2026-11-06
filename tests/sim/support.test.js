import { test, expect } from 'vitest';
import { step, STEP } from '../../src/sim/world.js';
import { applyMark } from '../../src/sim/effects.js';
import { shotDamage, damageTakenMultiplier } from '../../src/sim/damage.js';
import { towerStats } from '../../src/sim/towers.js';
import { sellTower, upgradeTower, startWave } from '../../src/sim/commands.js';
import { sandbox, place, enemyAt, run } from './helpers.js';

test('target painter and armor breaker add; each kind takes its strongest source', () => {
  const w = sandbox();
  const e = enemyAt(w, 'tank', 100);
  expect(damageTakenMultiplier(e)).toBe(1);
  applyMark(e, 'paint', 0.08, 2);
  applyMark(e, 'paint', 0.05, 5); // weaker painter: no stacking
  expect(damageTakenMultiplier(e)).toBeCloseTo(1.08, 5);
  applyMark(e, 'armor', 0.06, 2);
  expect(damageTakenMultiplier(e)).toBeCloseTo(1.14, 5);
  expect(shotDamage(100, e)).toBeCloseTo(114, 5);
  run(w, 2.1);
  expect(damageTakenMultiplier(e)).toBe(1);
});

test('painter and armor breaker towers mark what they hit', () => {
  const w = sandbox();
  place(w, 'target_painter', 6, 3);
  place(w, 'armor_breaker', 5, 3);
  const e = enemyAt(w, 'tank', 250);
  run(w, 0.5);
  expect(e.status.paint.amount).toBe(0.08);
  expect(e.status.armor.amount).toBe(0.06);
});

test('ammo feeder raises neighbour fire rate; out of range towers are unaffected', () => {
  const w = sandbox();
  const ar = place(w, 'ar_turret', 6, 3);
  const far = place(w, 'ar_turret', 12, 3);
  const base = towerStats(ar).rate;
  place(w, 'ammo_feeder', 7, 4); // ~1.4 tiles away; auraRange 2.0
  expect(towerStats(ar).rate).toBeCloseTo(base * 1.08, 5);
  expect(towerStats(far).rate).toBe(base);
});

test('auras do not stack (strongest wins) and recompute after sell and upgrade', () => {
  const w = sandbox();
  const ar = place(w, 'ar_turret', 6, 3);
  const f1 = place(w, 'ammo_feeder', 7, 4);
  const f2 = place(w, 'ammo_feeder', 5, 4);
  expect(ar.aura.fireRate).toBeCloseTo(0.08, 5); // two L1 feeders: not 0.16
  upgradeTower(w, f2.id); // L2: 0.10
  expect(ar.aura.fireRate).toBeCloseTo(0.10, 5);
  sellTower(w, f2.id);
  expect(ar.aura.fireRate).toBeCloseTo(0.08, 5);
  sellTower(w, f1.id);
  expect(ar.aura.fireRate).toBe(0);
});

test('command uplink extends range of nearby towers', () => {
  const w = sandbox();
  const ar = place(w, 'ar_turret', 6, 3);
  expect(towerStats(ar).range).toBe(4.0);
  const up = place(w, 'command_uplink', 5, 4);
  expect(towerStats(ar).range).toBeCloseTo(4.0 * 1.06, 5);
  const fd = place(w, 'ammo_feeder', 7, 4);
  expect(towerStats(ar).range).toBeCloseTo(4.0 * 1.06, 5); // feeder adds rate, not range
  expect(towerStats(ar).rate).toBeCloseTo(2.0 * 1.08, 5);
  sellTower(w, up.id);
  expect(towerStats(ar).range).toBe(4.0);
  expect(fd.aura.range).toBe(0);
});

test('logistics hub does not attack, does not crash, and pays at wave end', () => {
  const w = sandbox();
  w.waves = [{ enemies: [] }, { enemies: [] }];
  const hub = place(w, 'logistics_hub', 6, 3);
  expect(towerStats(hub)).toMatchObject({ rate: 0, damage: 0, dps: 0 });
  enemyAt(w, 'grunt', 250);
  run(w, 1);
  expect(w.projectiles).toHaveLength(0);
  w.enemies = [];
  const before = w.coins;
  expect(startWave(w).ok).toBe(true);
  step(w, STEP);
  const end = w.events.find((e) => e.type === 'waveEnd');
  expect(end).toBeDefined();
  expect(w.coins - before).toBe(end.stipend + 15);
  expect(end.hub).toBe(15);
});

test('gatling turret spools from 25% to 100% fire rate over 1s and resets when idle', () => {
  const w = sandbox();
  const g = place(w, 'gatling_turret', 6, 3); // rate 3.0
  const e = enemyAt(w, 'tank', 250);
  e.hp = e.maxHp = 1e6;
  expect(towerStats(g).rate).toBeCloseTo(0.75, 5);
  run(w, 0.5);
  expect(towerStats(g).rate).toBeCloseTo(3 * (0.25 + 0.75 * 0.5), 1);
  run(w, 0.6);
  expect(towerStats(g).rate).toBeCloseTo(3.0, 5);
  w.enemies = [];
  step(w, STEP);
  expect(g.spool).toBe(0);
  expect(towerStats(g).rate).toBeCloseTo(0.75, 5);
});

test('gatling fires fewer shots in its first second than in the next', () => {
  const w = sandbox();
  place(w, 'gatling_turret', 6, 3);
  const e = enemyAt(w, 'tank', 250);
  e.hp = e.maxHp = 1e6;
  const count = (sec) => { let n = 0; const seen = new Set(); for (let t = 0; t < sec; t += STEP) { step(w, STEP); for (const p of w.projectiles) if (!seen.has(p.id)) { seen.add(p.id); n++; } } return n; };
  const first = count(1);
  const second = count(1);
  expect(first).toBeLessThan(second);
});
