import { test, expect } from 'vitest';
import { SAVE_KEY, freshSave, loadSave, writeSave, recordClear, isLevelUnlocked, hasProgress, summarizeCampaign, MAX_LEVEL } from '../src/core/save.js';
import { medalFor, isBetterMedal } from '../src/core/medals.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
}
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); } };

test('medalFor thresholds', () => {
  expect(medalFor(0)).toBe('gold');
  expect(medalFor(1)).toBe('silver');
  expect(medalFor(5)).toBe('silver');
  expect(medalFor(6)).toBe('bronze');
  expect(medalFor(25)).toBe('bronze');
  expect(isBetterMedal('gold', 'silver')).toBe(true);
  expect(isBetterMedal('bronze', 'silver')).toBe(false);
  expect(isBetterMedal('bronze', undefined)).toBe(true);
});

test('missing storage value gives a fresh save', () => {
  const s = loadSave(fakeStorage());
  expect(s).toEqual(freshSave());
  expect(s.unlockedLevel).toBe(1);
  expect(hasProgress(s)).toBe(false);
});

test('corrupt json, wrong version and junk fields fall back safely', () => {
  expect(loadSave(fakeStorage({ [SAVE_KEY]: '{not json' }))).toEqual(freshSave());
  expect(loadSave(fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: 2, unlockedLevel: 9 }) }))).toEqual(freshSave());
  expect(loadSave(fakeStorage({ [SAVE_KEY]: 'null' }))).toEqual(freshSave());
  const s = loadSave(fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: 1, unlockedLevel: 'x', medals: { 1: 'platinum', 2: 'gold', 99: 'gold', abc: 'gold' } }) }));
  expect(s.medals).toEqual({ 2: 'gold' });
  expect(s.unlockedLevel).toBe(3);
});

test('round trip through storage', () => {
  const st = fakeStorage();
  const s = freshSave();
  recordClear(s, 1, 'silver');
  expect(writeSave(s, st)).toBe(true);
  expect(loadSave(st)).toEqual(s);
});

test('clearing level N unlocks N+1 and never regresses', () => {
  const s = freshSave();
  expect(isLevelUnlocked(s, 1)).toBe(true);
  expect(isLevelUnlocked(s, 2)).toBe(false);
  recordClear(s, 1, 'bronze');
  expect(s.unlockedLevel).toBe(2);
  expect(isLevelUnlocked(s, 2)).toBe(true);
  recordClear(s, 2, 'gold');
  recordClear(s, 1, 'gold'); // replay of an old level
  expect(s.unlockedLevel).toBe(3);
  recordClear(s, MAX_LEVEL, 'bronze');
  expect(s.unlockedLevel).toBe(MAX_LEVEL);
});

test('medals only upgrade', () => {
  const s = freshSave();
  recordClear(s, 1, 'silver');
  recordClear(s, 1, 'bronze');
  expect(s.medals[1]).toBe('silver');
  recordClear(s, 1, 'gold');
  expect(s.medals[1]).toBe('gold');
  recordClear(s, 1, 'silver');
  expect(s.medals[1]).toBe('gold');
});

test('throwing storage never throws and gives fresh save', () => {
  expect(loadSave(throwing)).toEqual(freshSave());
  expect(writeSave(freshSave(), throwing)).toBe(false);
  expect(loadSave(null)).toEqual(freshSave());
  expect(writeSave(freshSave(), null)).toBe(false);
});

test('campaign summary aggregates medals and best towers', () => {
  const s = freshSave();
  recordClear(s, 1, 'gold', { time: 60, towers: [{ typeId: 'ar_turret', damage: 500, kills: 10, spent: 100 }, { typeId: 'mortar', damage: 900, kills: 5, spent: 200 }] });
  recordClear(s, 2, 'bronze', { time: 40, towers: [{ typeId: 'ar_turret', damage: 600, kills: 12, spent: 100 }] });
  const sum = summarizeCampaign(s);
  expect(sum).toMatchObject({ gold: 1, bronze: 1, silver: 0, cleared: 2, playTime: 100 });
  expect(sum.bestTowers[0]).toMatchObject({ typeId: 'ar_turret', damage: 1100 });
  expect(sum.bestTowers).toHaveLength(2);
});
