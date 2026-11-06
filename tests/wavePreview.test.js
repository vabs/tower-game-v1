import { test, expect } from 'vitest';
import { summarizeWave } from '../src/ui/wavePreview.js';
import { buildWaves, scaledHp } from '../src/data/waves.js';
import { enemies } from '../src/data/enemies.js';
import { bosses } from '../src/data/bosses.js';
import { levels } from '../src/data/levels.js';

test('summarizes counts, names and level-scaled HP', () => {
  const wave = buildWaves(1)[1];
  const s = summarizeWave(wave, 1);
  expect(s.groups.map((g) => [g.id, g.count])).toEqual([['grunt', 6], ['runner', 3]]);
  expect(s.total).toBe(9);
  expect(s.hasAir).toBe(false);
  expect(s.hasBoss).toBe(false);
  expect(s.supply).toBe(false);
  expect(s.groups[0].hp).toBe(Math.round(scaledHp(enemies.find((e) => e.id === 'grunt'), 1)));
  expect(s.groups[0].name).toBe('Grunt');
});

test('difficulty HP multiplier is reflected', () => {
  const wave = buildWaves(1)[0];
  expect(summarizeWave(wave, 1, { hpMult: 1.2 }).groups[0].hp).toBe(Math.round(80 * 1.2));
});

test('boss waves flag the boss and air units', () => {
  const lv = levels.findIndex((l) => l.boss === 'sky_tank_boss') + 1;
  const waves = buildWaves(lv);
  const last = summarizeWave(waves[waves.length - 1], lv);
  expect(last.hasBoss).toBe(true);
  const boss = last.groups.find((g) => g.boss);
  expect(boss.air).toBe(true);
  expect(boss.hp).toBe(Math.round(scaledHp(bosses.find((b) => b.id === 'sky_tank_boss'), lv)));
  expect(boss.sprite).toBe('bosses/sky_tank_boss');
  expect(last.hasAir).toBe(true);
});

test('supply drop waves show coins and no groups', () => {
  const lv = levels.findIndex((l) => l.supplyDropAfterWave != null) + 1;
  const waves = buildWaves(lv);
  const supply = summarizeWave(waves.find((w) => w.supply), lv);
  expect(supply.supply).toBe(true);
  expect(supply.coins).toBe(150 + 10 * lv);
  expect(supply.groups).toEqual([]);
});

test('missing wave gives null; repeated ids merge', () => {
  expect(summarizeWave(undefined, 1)).toBeNull();
  const s = summarizeWave({ enemies: [{ id: 'grunt', count: 2 }, { id: 'grunt', count: 3 }] }, 1);
  expect(s.groups).toHaveLength(1);
  expect(s.groups[0].count).toBe(5);
});
