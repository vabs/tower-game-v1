import { test, expect } from 'vitest';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { upgradeTower, sellTower } from '../../src/sim/commands.js';
import { snapshotStats } from '../../src/sim/stats.js';
import { applyDamage } from '../../src/sim/damage.js';
import { sandbox, place, enemyAt, run } from './helpers.js';
import { towers } from '../../src/data/towers.js';

const cost0 = (id) => towers.find((t) => t.id === id).levels[0].cost;

test('fresh world has empty stats', () => {
  const w = createWorld(1);
  expect(w.stats).toEqual({ towers: {}, enemies: {}, hpLost: 0 });
});

test('placing and upgrading accumulates coins spent per tower', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  expect(w.stats.towers[t.id]).toMatchObject({ typeId: 'ar_turret', spent: cost0('ar_turret'), damage: 0, kills: 0 });
  const r = upgradeTower(w, t.id);
  expect(w.stats.towers[t.id].spent).toBe(cost0('ar_turret') + r.cost);
  expect(w.stats.towers[t.id].spent).toBe(t.spent);
});

test('damage is credited without overkill and kills attributed', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  const e = enemyAt(w, 'grunt', 100);
  e.hp = 10;
  applyDamage(w, e, 25, t.id);
  expect(w.stats.towers[t.id]).toMatchObject({ damage: 10, kills: 1 });
  expect(w.stats.enemies.grunt).toMatchObject({ seen: 1, killed: 1, leaked: 0 });
});

test('stats survive selling the tower', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  const e = enemyAt(w, 'grunt', 100);
  applyDamage(w, e, 20, t.id);
  sellTower(w, t.id);
  expect(w.towers).toHaveLength(0);
  expect(snapshotStats(w).towers[0]).toMatchObject({ typeId: 'ar_turret', damage: 20 });
  applyDamage(w, e, 5, t.id); // late projectile of a sold tower must not throw
});

test('real shooting credits the tower', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  enemyAt(w, 'grunt', 264); // frozen next to the tower
  run(w, 6);
  const s = w.stats.towers[t.id];
  expect(s.damage).toBeGreaterThan(0);
  expect(s.damage).toBeLessThanOrEqual(80 + 1e-6);
});

test('splash credits every enemy hit to the shooting tower', () => {
  const w = sandbox();
  const t = place(w, 'mortar', 6, 3);
  const a = enemyAt(w, 'grunt', 264);
  const b = enemyAt(w, 'grunt', 270);
  for (const e of [a, b]) e.hp = 5;
  run(w, 8);
  const s = w.stats.towers[t.id];
  expect(a.dead && b.dead).toBe(true);
  expect(s.kills).toBe(2);
  expect(s.damage).toBeCloseTo(10, 5); // 5 hp each, overkill excluded
});

test('damage over time is credited to the source tower', () => {
  const w = sandbox();
  const t = place(w, 'incendiary_turret', 6, 3);
  const e = enemyAt(w, 'tank', 264);
  const before = e.hp;
  run(w, 5);
  const s = w.stats.towers[t.id];
  expect(s.damage).toBeGreaterThan(0);
  expect(s.damage).toBeCloseTo(before - Math.max(0, e.hp), 4);
});

test('enemy seen / killed / leaked counts and hp lost', () => {
  const w = createWorld(1, { hp: 25 });
  const e = enemyAt(w, 'grunt', w.map.pathLengths[0] - 1, { frozen: false });
  const f = enemyAt(w, 'runner', 10);
  applyDamage(w, f, 9999, undefined);
  for (let i = 0; i < 30; i++) step(w, STEP);
  expect(e.leaked).toBe(true);
  expect(w.stats.enemies.grunt).toMatchObject({ seen: 1, leaked: 1, killed: 0 });
  expect(w.stats.enemies.runner).toMatchObject({ seen: 1, killed: 1, leaked: 0 });
  expect(w.stats.hpLost).toBe(w.maxHp - w.hp);
  expect(w.stats.hpLost).toBeGreaterThan(0);
});

test('hp lost never exceeds remaining hp', () => {
  const w = createWorld(1, { hp: 1 });
  enemyAt(w, 'heavy', w.map.pathLengths[0] - 1, { frozen: false });
  for (let i = 0; i < 10; i++) step(w, STEP);
  expect(w.hp).toBe(0);
  expect(w.stats.hpLost).toBe(1);
});
