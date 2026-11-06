import { test, expect } from 'vitest';
import { buildWaves, INTRODUCED_AT, levelScaling } from '../../src/data/waves.js';
import { bosses, BOSS_SEQUENCE } from '../../src/data/bosses.js';
import { enemies } from '../../src/data/enemies.js';
import { levels } from '../../src/data/levels.js';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { startWave } from '../../src/sim/commands.js';
import { spawnEnemy } from '../../src/sim/enemies.js';

const airIds = new Set(enemies.filter((e) => e.type === 'air').map((e) => e.id));
const bossIds = new Set(bosses.map((b) => b.id));
const all = levels.map((l) => l.id);

test('every enemy has an introduction level', () => {
  for (const e of enemies) expect(INTRODUCED_AT[e.id], e.id).toBeGreaterThanOrEqual(1);
});

test.each(all)('level %i waves are well-formed', (n) => {
  const lv = levels[n - 1];
  const waves = buildWaves(n);
  const combat = waves.filter((w) => !w.supply);
  const supply = waves.filter((w) => w.supply);
  expect(combat).toHaveLength(lv.combatWaves);
  expect(supply).toHaveLength(lv.supplyDropAfterWave ? 1 : 0);
  if (lv.supplyDropAfterWave) {
    const w = waves[lv.supplyDropAfterWave];
    expect(w.supply).toBe(true);
    expect(w.coins).toBe(150 + 10 * n);
    expect(w.enemies).toHaveLength(0);
  }
  for (const w of combat) {
    expect(w.enemies.length).toBeGreaterThan(0);
    for (const g of w.enemies) {
      expect(g.count).toBeGreaterThan(0);
      expect(g.interval).toBeGreaterThan(0);
      if (bossIds.has(g.id)) continue;
      expect(INTRODUCED_AT[g.id], g.id).toBeLessThanOrEqual(n);
      if (n < 11) expect(airIds.has(g.id)).toBe(false);
    }
  }
  // newly introduced enemies feature in the level
  const fresh = Object.keys(INTRODUCED_AT).filter((id) => INTRODUCED_AT[id] === n);
  const used = new Set(combat.flatMap((w) => w.enemies.map((g) => g.id)));
  for (const id of fresh) expect(used.has(id), `${id} at level ${n}`).toBe(true);
  // bosses only on the final combat wave
  const last = combat[combat.length - 1];
  const expected = lv.boss ? BOSS_SEQUENCE[lv.boss] : [];
  expect(last.enemies.filter((g) => bossIds.has(g.id)).map((g) => g.id)).toEqual(expected);
  for (const w of combat.slice(0, -1)) expect(w.enemies.some((g) => bossIds.has(g.id))).toBe(false);
  // deterministic
  expect(buildWaves(n)).toEqual(waves);
});

test('level 1 keeps the hardcoded M1 waves', () => {
  expect(buildWaves(1).map((w) => w.enemies.map((g) => `${g.count}${g.id}`))).toEqual([
    ['6grunt'],
    ['6grunt', '3runner'],
    ['8grunt', '5runner'],
  ]);
});

test('boss levels', () => {
  const ids = (n) => buildWaves(n).at(-1).enemies.map((g) => g.id).filter((id) => bossIds.has(id));
  expect(ids(10)).toEqual(['heavy_boss']);
  expect(ids(20)).toEqual(['sky_tank_boss']);
  expect(ids(30)).toEqual(['tank_boss']);
  expect(ids(40)).toEqual(['sky_tank_boss']);
  expect(ids(50)).toEqual(['bulldozer_boss', 'sky_tank_boss']);
});

test('boss defs derive from base enemies', () => {
  const heavy = enemies.find((e) => e.id === 'heavy');
  const b = bosses.find((x) => x.id === 'heavy_boss');
  expect(b).toMatchObject({ hp: heavy.hp * 12, speed: heavy.speed * 0.8, coins: heavy.coins * 10, leak: 25, boss: true, scale: 1.5, sprite: 'bosses/heavy_boss' });
  expect(bosses.find((x) => x.id === 'sky_tank_boss').type).toBe('air');
});

test('levelScaling', () => {
  expect(levelScaling(1)).toEqual({ hp: 1, speed: 1 });
  expect(levelScaling(10).hp).toBeCloseTo(1.54);
  expect(levelScaling(10).speed).toBeCloseTo(1.01);
  expect(levelScaling(50).hp).toBeCloseTo(3.94);
  expect(levelScaling(50).speed).toBeCloseTo(1.05);
});

test('spawnEnemy applies scaling and boss stats', () => {
  const w = createWorld(10);
  const g = spawnEnemy(w, 'grunt');
  expect(g.maxHp).toBeCloseTo(80 * 1.54);
  expect(g.speed).toBeCloseTo(1.01);
  const b = spawnEnemy(w, 'heavy_boss');
  expect(b).toMatchObject({ boss: true, scale: 1.5, leak: 25, sprite: 'bosses/heavy_boss' });
  expect(b.maxHp).toBeCloseTo(220 * 12 * 1.54);
});

test('supply drop pays coins and ends immediately without enemies', () => {
  const w = createWorld(6); // supply drop after wave 3
  w.hp = w.maxHp = 1e6;
  w.waveIndex = 3;
  expect(w.waves[3].supply).toBe(true);
  const before = w.coins;
  expect(startWave(w).ok).toBe(true);
  expect(w.coins).toBeGreaterThanOrEqual(before + 210);
  for (let i = 0; i < 5; i++) step(w, STEP);
  expect(w.enemies).toHaveLength(0);
  expect(w.phase).toBe('build');
  expect(w.waveIndex).toBe(4);
  expect(w.events.some((e) => e.type === 'supplyDrop' && e.coins === 210)).toBe(true);
});
