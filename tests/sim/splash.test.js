import { test, expect } from 'vitest';
import { step, STEP } from '../../src/sim/world.js';
import { splashImpact } from '../../src/sim/projectiles.js';
import { setTargeting } from '../../src/sim/commands.js';
import { sandbox, place, enemyAt, runUntilEvent } from './helpers.js';

const lost = (e) => e.maxHp - e.hp;

test('splash damages every enemy within the radius and not those outside', () => {
  const w = sandbox();
  const t = place(w, 'grenade_launcher', 6, 3); // splash 1.0 tile = 48 px, dmg 20
  setTargeting(w, t.id, 'last'); // aim at the rearmost enemy
  const group = [240, 250, 260].map((d) => enemyAt(w, 'tank', d));
  const outlier = enemyAt(w, 'tank', 320); // 80 px from the impact point
  expect(runUntilEvent(w, 'splash')).toBe(true);
  expect(group.map(lost)).toEqual([20, 20, 20]);
  expect(lost(outlier)).toBe(0);
});

test('splash respects air eligibility: ground shots skip air, AA shots hit both', () => {
  const w = sandbox();
  const g = enemyAt(w, 'tank', 300);
  const d = enemyAt(w, 'drone', 300);
  d.x = g.x; d.y = g.y; // stacked at the impact point
  const base = { damage: 20, towerId: 0, effects: {} };
  splashImpact(w, g.x, g.y, 48, { ...base, mods: { aa: false, airBonus: 0, canHitAir: false } });
  expect(lost(g)).toBe(20);
  expect(lost(d)).toBe(0);
  splashImpact(w, g.x, g.y, 48, { ...base, mods: { aa: true, airBonus: 0.4, canHitAir: true } });
  expect(lost(g)).toBeCloseTo(20 + 12, 5); // 60% to ground
  expect(lost(d)).toBeCloseTo(28, 5); // +40% to air
});

test('flak splash hits an air unit at the impact point for air-bonus damage', () => {
  const f = sandbox();
  place(f, 'flak_cannon', 6, 3);
  const fd = enemyAt(f, 'drone', 300);
  expect(runUntilEvent(f, 'splash')).toBe(true);
  expect(lost(fd)).toBeCloseTo(18 * 1.4, 5);
});

test('mortar lands where the target was at fire time', () => {
  const w = sandbox();
  place(w, 'mortar', 6, 3); // centre (312,168)
  const e = enemyAt(w, 'grunt', 200, { frozen: false });
  e.hp = e.maxHp = 5000;
  step(w, STEP);
  expect(w.projectiles).toHaveLength(1);
  const p = w.projectiles[0];
  expect(p.arc).toBe(true);
  const aim = { x: p.tx, y: p.ty };
  expect(Math.hypot(aim.x - e.x, aim.y - e.y)).toBeLessThan(3); // aimed at where it stood
  expect(runUntilEvent(w, 'splash')).toBe(true);
  const ev = w.events.find((x) => x.type === 'splash');
  expect(ev.x).toBe(aim.x);
  expect(ev.y).toBe(aim.y);
  expect(e.x - aim.x).toBeGreaterThan(5); // it walked on; the shell did not follow
});
