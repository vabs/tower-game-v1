import { test, expect } from 'vitest';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { placeTower, canPlaceTower, startWave } from '../../src/sim/commands.js';
import { spawnEnemy } from '../../src/sim/enemies.js';
import { towers } from '../../src/data/towers.js';

const AR_COST = towers.find((t) => t.id === 'ar_turret').levels[0].cost;

test('placement succeeds on buildable tile and charges coins', () => {
  const w = createWorld(1);
  const coins = w.coins;
  const r = placeTower(w, 'ar_turret', 6, 3);
  expect(r.ok).toBe(true);
  expect(w.towers).toHaveLength(1);
  expect(w.coins).toBe(coins - AR_COST);
});

test('placement rejects path, blocked, out-of-bounds tiles', () => {
  const w = createWorld(1);
  expect(placeTower(w, 'ar_turret', 5, 2)).toEqual({ ok: false, reason: 'not_buildable' }); // path
  expect(placeTower(w, 'ar_turret', 2, 0)).toEqual({ ok: false, reason: 'not_buildable' }); // blocked
  expect(placeTower(w, 'ar_turret', -1, 0)).toEqual({ ok: false, reason: 'not_buildable' });
  expect(placeTower(w, 'ar_turret', 0, 2)).toEqual({ ok: false, reason: 'not_buildable' }); // spawn
  expect(w.towers).toHaveLength(0);
});

test('placement rejects occupied tiles', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 6, 3);
  expect(placeTower(w, 'ar_turret', 6, 3)).toEqual({ ok: false, reason: 'occupied' });
});

test('placement rejects when unaffordable', () => {
  const w = createWorld(1);
  w.coins = AR_COST - 1;
  expect(placeTower(w, 'ar_turret', 6, 3)).toEqual({ ok: false, reason: 'unaffordable' });
  expect(w.coins).toBe(AR_COST - 1);
});

test('placement rejects locked and unknown towers', () => {
  const w = createWorld(1);
  expect(placeTower(w, 'smg_nest', 6, 3)).toEqual({ ok: false, reason: 'locked' });
  expect(placeTower(w, 'nope', 6, 3)).toEqual({ ok: false, reason: 'unknown_tower' });
});

test('canPlaceTower has no side effects', () => {
  const w = createWorld(1);
  const coins = w.coins;
  expect(canPlaceTower(w, 'ar_turret', 6, 3).ok).toBe(true);
  expect(w.coins).toBe(coins);
  expect(w.towers).toHaveLength(0);
});

test('a tower kills a grunt in range and coins are awarded exactly once', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 6, 3);
  const coinsAfterPlace = w.coins;
  const g = spawnEnemy(w, 'grunt');
  let t = 0;
  while (!g.dead && t < 30) { step(w, STEP); t += STEP; }
  expect(g.dead).toBe(true);
  expect(w.coins).toBe(coinsAfterPlace + g.coins);
  for (let i = 0; i < 120; i++) step(w, STEP);
  expect(w.coins).toBe(coinsAfterPlace + g.coins);
  expect(w.events.filter((e) => e.type === 'kill')).toHaveLength(1);
  expect(w.enemies).toHaveLength(0);
  expect(w.hp).toBe(w.maxHp);
});

test('tower does not fire at enemies out of range', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 18, 0);
  spawnEnemy(w, 'grunt');
  for (let i = 0; i < 60; i++) step(w, STEP);
  expect(w.projectiles).toHaveLength(0);
});

test('ground towers cannot hit air, AA MG can', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 6, 3);
  const d = spawnEnemy(w, 'drone');
  d.distance = d.length / 2; // hovering over the middle of the map, in range of both
  step(w, STEP);
  expect(w.projectiles).toHaveLength(0);
  placeTower(w, 'aa_mg', 7, 4);
  step(w, STEP);
  expect(w.projectiles).toHaveLength(1);
});

test('projectile is discarded when its target dies mid-flight', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 6, 3);
  const g = spawnEnemy(w, 'grunt');
  g.x = 6 * 48 + 24; g.y = 2 * 48 + 24; g.distance = 6 * 48;
  step(w, STEP);
  expect(w.projectiles).toHaveLength(1);
  g.dead = true;
  step(w, STEP);
  expect(w.projectiles).toHaveLength(0);
  expect(w.events.some((e) => e.type === 'kill')).toBe(false);
});

test('commands are blocked after the game ends', () => {
  const w = createWorld(1);
  w.phase = 'lost';
  expect(placeTower(w, 'ar_turret', 6, 3)).toEqual({ ok: false, reason: 'game_over' });
  expect(startWave(w).ok).toBe(false);
});
