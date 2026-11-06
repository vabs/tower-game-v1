import { test, expect } from 'vitest';
import { createWorld, startingCoins } from '../src/sim/world.js';
import { spawnEnemy, leakDamage } from '../src/sim/enemies.js';
import { DIFFICULTIES, getDifficulty } from '../src/core/difficulty.js';
import { SAVE_KEY, freshSave, loadSave, recordClear, normalizeSave } from '../src/core/save.js';
import { levelScaling } from '../src/data/waves.js';

const hpOf = (diff, level = 3) => {
  const w = createWorld(level, { seed: 1, difficulty: diff });
  return spawnEnemy(w, 'grunt');
};

test('enemy HP scales with difficulty (Recruit x0.75, Veteran x1.10)', () => {
  const base = hpOf('regular').maxHp;
  expect(base).toBeCloseTo(80 * levelScaling(3).hp);
  expect(hpOf('recruit').maxHp).toBeCloseTo(base * 0.75);
  expect(hpOf('veteran').maxHp).toBeCloseTo(base * 1.1);
  expect(hpOf(undefined).maxHp).toBeCloseTo(base);
  expect(hpOf('nonsense').maxHp).toBeCloseTo(base);
});

test('bosses scale too', () => {
  const mk = (d) => { const w = createWorld(10, { difficulty: d }); return spawnEnemy(w, 'heavy_boss').maxHp; };
  expect(mk('veteran') / mk('regular')).toBeCloseTo(1.1);
});

test('starting coins: Recruit +25%, others unchanged; explicit coins win', () => {
  expect(createWorld(5, { difficulty: 'recruit' }).coins).toBe(Math.round(startingCoins(5) * 1.25));
  expect(createWorld(5, { difficulty: 'regular' }).coins).toBe(startingCoins(5));
  expect(createWorld(5, { difficulty: 'veteran' }).coins).toBe(startingCoins(5));
  expect(createWorld(5, { difficulty: 'recruit', coins: 7 }).coins).toBe(7);
});

test('leak damage is the same on every difficulty', () => {
  for (const d of ['recruit', 'regular', 'veteran']) {
    const e = hpOf(d);
    expect(e.leak).toBe(leakDamage(80));
  }
  expect(DIFFICULTIES.veteran.hpMult).toBe(1.1);
  expect(getDifficulty('regular').hpMult).toBe(1);
});

test('default world is Regular', () => {
  expect(createWorld(1).difficulty.id).toBe('regular');
});

const storage = (obj) => ({ getItem: () => JSON.stringify(obj), setItem() {}, removeItem() {} });

test('old save without difficulty migrates to Regular, keeping progress', () => {
  const s = loadSave(storage({ version: 1, unlockedLevel: 4, medals: { 1: 'gold', 2: 'silver' }, stats: { playTime: 5, towers: {} } }));
  expect(s.difficulty).toBe('regular');
  expect(s.medals).toEqual({ 1: 'gold', 2: 'silver' });
  expect(s.unlockedLevel).toBe(4);
  expect(s.medalDifficulty).toEqual({});
});

test('saved difficulty persists; invalid values fall back', () => {
  expect(loadSave(storage({ version: 1, difficulty: 'veteran' })).difficulty).toBe('veteran');
  expect(normalizeSave({ version: 1, difficulty: 'godmode' }).difficulty).toBe('regular');
  expect(normalizeSave({ version: 1, medals: { 1: 'gold' }, medalDifficulty: { 1: 'bad', 2: 'recruit' } }).medalDifficulty).toEqual({});
  expect(SAVE_KEY).toBe('td-save-v1');
});

test('medal records the difficulty it was earned on', () => {
  const s = freshSave();
  recordClear(s, 1, 'silver', { difficulty: 'recruit' });
  expect(s.medalDifficulty[1]).toBe('recruit');
  recordClear(s, 1, 'bronze', { difficulty: 'veteran' }); // worse medal: unchanged
  expect(s.medals[1]).toBe('silver');
  expect(s.medalDifficulty[1]).toBe('recruit');
  recordClear(s, 1, 'silver', { difficulty: 'veteran' }); // same medal, harder
  expect(s.medalDifficulty[1]).toBe('veteran');
  recordClear(s, 1, 'gold');
  expect(s.medalDifficulty[1]).toBe('regular');
});
