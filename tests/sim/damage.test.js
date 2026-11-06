import { test, expect } from 'vitest';
import { step, STEP } from '../../src/sim/world.js';
import { upgradeTower } from '../../src/sim/commands.js';
import { sandbox, place, enemyAt, run, runUntilEvent } from './helpers.js';

function firstHit(w) {
  expect(runUntilEvent(w, 'hit')).toBe(true);
}

test('crit doubles damage (stubbed rng)', () => {
  for (const [roll, expected] of [[true, 36], [false, 18]]) {
    const w = sandbox();
    w.rng = { chance: () => roll, next: () => 0.5, int: () => 0 };
    place(w, 'marksman_tower', 6, 3);
    const e = enemyAt(w, 'tank', 250);
    e.hp = e.maxHp = 10000;
    firstHit(w);
    expect(10000 - e.hp).toBe(expected);
  }
});

test('crits are deterministic for a seed and differ between seeds', () => {
  const hpAfter = (seed) => {
    const w = sandbox(seed);
    place(w, 'sniper_nest', 6, 3); // 10% crit
    const e = enemyAt(w, 'tank', 250);
    e.hp = e.maxHp = 1e6;
    run(w, 60);
    return e.hp;
  };
  expect(hpAfter(5)).toBe(hpAfter(5));
  expect(hpAfter(5)).not.toBe(hpAfter(6));
});

test('AA does 60% to ground and +airBonus to air; AA tower is not crit-rolled', () => {
  const ground = sandbox();
  place(ground, 'aa_mg', 6, 3);
  const g = enemyAt(ground, 'tank', 250);
  g.hp = g.maxHp = 1000;
  firstHit(ground);
  expect(1000 - g.hp).toBeCloseTo(6 * 0.6, 5);

  const air = sandbox();
  place(air, 'aa_mg', 6, 3);
  const d = enemyAt(air, 'drone', 300); // air line passes ~70px from the tower
  d.hp = d.maxHp = 1000;
  firstHit(air);
  expect(1000 - d.hp).toBeCloseTo(6 * 1.3, 5);
});

test('ground towers ignore air units (precision, explosive, control)', () => {
  const w = sandbox();
  for (const [id, x] of [['marksman_tower', 5], ['grenade_launcher', 9], ['cryo_sprayer', 4], ['rail_autocannon', 3]]) place(w, id, x, 3);
  const d = enemyAt(w, 'drone', 300);
  run(w, 2);
  expect(w.projectiles).toHaveLength(0);
  expect(w.events.filter((e) => e.type === 'hit' || e.type === 'beam')).toHaveLength(0);
  expect(d.hp).toBe(d.maxHp);
});

test('rail autocannon pierces N enemies along its line and no more', () => {
  const w = sandbox();
  place(w, 'rail_autocannon', 11, 1); // straight above the vertical lane at x=552
  const hpOf = (e) => e.maxHp - e.hp;
  // vertical lane: distance 528 is the corner (552,120); y = 120 + (d - 528)
  const es = [538, 568, 598, 628].map((d) => enemyAt(w, 'tank', d));
  for (const e of es) { e.hp = e.maxHp = 1000; }
  step(w, STEP);
  expect(es.map(hpOf)).toEqual([28, 28, 0, 0]); // L1 pierce 2

  const w2 = sandbox();
  const t = place(w2, 'rail_autocannon', 11, 1);
  upgradeTower(w2, t.id); upgradeTower(w2, t.id); // L3 pierce 3
  const es2 = [538, 568, 598, 628].map((d) => enemyAt(w2, 'tank', d));
  for (const e of es2) { e.hp = e.maxHp = 1000; }
  step(w2, STEP);
  expect(es2.map(hpOf)).toEqual([38, 38, 38, 0]);
  expect(w2.events.some((e) => e.type === 'beam')).toBe(true);
});

test('Interceptor Drone is an AA tower that fires from its orbiting drone', () => {
  const w = sandbox();
  const t = place(w, 'interceptor_drone', 6, 3);
  enemyAt(w, 'drone', 300);
  step(w, STEP);
  expect(w.projectiles).toHaveLength(1);
  const p = w.projectiles[0];
  expect(Math.hypot(p.sx - t.x, p.sy - t.y)).toBeGreaterThan(5); // left from the drone, not the base
});
