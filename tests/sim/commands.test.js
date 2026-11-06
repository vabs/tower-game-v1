import { test, expect } from 'vitest';
import { step, STEP } from '../../src/sim/world.js';
import { upgradeTower, sellTower, setTargeting, upgradeCostOf, sellValue } from '../../src/sim/commands.js';
import { sandbox, place, enemyAt, run } from './helpers.js';

test('upgrade costs the base price in build phase and +15% (rounded up) in a wave', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  expect(upgradeCostOf(w, t)).toBe(130);
  w.phase = 'wave';
  expect(upgradeCostOf(w, t)).toBe(150); // ceil(130 * 1.15)
  const before = w.coins;
  expect(upgradeTower(w, t.id)).toMatchObject({ ok: true, cost: 150, level: 2 });
  expect(w.coins).toBe(before - 150);
  expect(t.spent).toBe(80 + 150);
});

test('upgrade stops at level 5', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  for (let i = 0; i < 4; i++) expect(upgradeTower(w, t.id).ok).toBe(true);
  expect(t.level).toBe(5);
  expect(upgradeCostOf(w, t)).toBeNull();
  expect(upgradeTower(w, t.id)).toEqual({ ok: false, reason: 'max_level' });
  expect(t.level).toBe(5);
});

test('upgrade rejects when unaffordable, unknown tower, or game over', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  w.coins = 129;
  expect(upgradeTower(w, t.id)).toEqual({ ok: false, reason: 'unaffordable' });
  expect(upgradeTower(w, 9999)).toEqual({ ok: false, reason: 'not_found' });
  w.phase = 'lost';
  expect(upgradeTower(w, t.id)).toEqual({ ok: false, reason: 'game_over' });
});

test('sell refunds 70% of total spent in build phase and 50% during a wave', () => {
  const w = sandbox();
  const a = place(w, 'ar_turret', 6, 3);
  upgradeTower(w, a.id); // spent 80 + 130 = 210
  expect(sellValue(w, a)).toBe(147);
  const before = w.coins;
  expect(sellTower(w, a.id)).toEqual({ ok: true, refund: 147 });
  expect(w.coins).toBe(before + 147);
  expect(w.towers).toHaveLength(0);

  const b = place(w, 'ar_turret', 6, 3);
  w.phase = 'wave';
  const c0 = w.coins;
  expect(sellTower(w, b.id)).toEqual({ ok: true, refund: 40 });
  expect(w.coins).toBe(c0 + 40);
  expect(sellTower(w, b.id)).toEqual({ ok: false, reason: 'not_found' });
});

test('targeting mode changes which enemy a tower shoots', () => {
  const picked = {};
  for (const mode of ['first', 'last', 'closest', 'strongest']) {
    const w = sandbox();
    const t = place(w, 'ar_turret', 6, 3); // centre (312, 168)
    const lead = enemyAt(w, 'grunt', 300); // furthest along, closest to tower
    const rear = enemyAt(w, 'grunt', 200);
    const mid = enemyAt(w, 'grunt', 250);
    mid.hp = 500; // strongest
    expect(setTargeting(w, t.id, mode)).toEqual({ ok: true });
    step(w, STEP);
    picked[mode] = w.projectiles[0].target;
    expect(picked[mode]).toBeDefined();
    expect(t.targeting).toBe(mode);
    if (mode === 'first') expect(picked[mode]).toBe(lead);
    if (mode === 'last') expect(picked[mode]).toBe(rear);
    if (mode === 'closest') expect(picked[mode]).toBe(lead);
    if (mode === 'strongest') expect(picked[mode]).toBe(mid);
  }
});

test('setTargeting rejects unknown modes and towers', () => {
  const w = sandbox();
  const t = place(w, 'ar_turret', 6, 3);
  expect(setTargeting(w, t.id, 'weakest')).toEqual({ ok: false, reason: 'bad_mode' });
  expect(setTargeting(w, 12345, 'last')).toEqual({ ok: false, reason: 'not_found' });
  expect(t.targeting).toBe('first');
  run(w, 0.1);
});

test('anti-air towers default to air targeting; air mode is AA only', () => {
  const w = sandbox();
  const aa = place(w, 'aa_mg', 6, 3);
  const ar = place(w, 'ar_turret', 5, 3);
  expect(aa.targeting).toBe('air');
  expect(ar.targeting).toBe('first');
  expect(setTargeting(w, ar.id, 'air')).toEqual({ ok: false, reason: 'bad_mode' });
  expect(setTargeting(w, aa.id, 'air')).toEqual({ ok: true });
});

test('air-targeting AA shoots the air unit before a ground unit closer to exit', () => {
  const w = sandbox();
  place(w, 'aa_mg', 6, 3);
  const ground = enemyAt(w, 'grunt', 300);
  const air = enemyAt(w, 'drone', 100);
  air.x = 312; air.y = 150;
  step(w, STEP);
  expect(w.projectiles[0].target).toBe(air);
  expect(ground.hp).toBe(ground.maxHp);
});
