import { test, expect } from 'vitest';
import { upgradeDelta, towerCardInfo, levelSpecial } from '../src/ui/towerInfo.js';
import { towers } from '../src/data/towers.js';

const def = (id) => towers.find((t) => t.id === id);

test('upgrade delta for AR Turret L1 -> L2', () => {
  const d = upgradeDelta(def('ar_turret'), 1, 40);
  expect(d.toLevel).toBe(2);
  expect(d.dDamage).toBe(2);
  expect(d.dRate).toBeCloseTo(0.2);
  expect(d.dDps).toBeCloseTo(10 * 2.2 - 8 * 2.0);
  expect(d.dpsPerCoin).toBeCloseTo(d.dDps / 40);
  expect(d.text).toContain('+2 dmg');
  expect(d.text).toContain('+0.2 rate');
  expect(d.text).toContain('DPS');
});

test('no delta at max level; every tower has a delta at L1-L4', () => {
  expect(upgradeDelta(def('ar_turret'), 5, 10)).toBeNull();
  for (const t of towers) for (let l = 1; l < 5; l++) expect(upgradeDelta(t, l, t.levels[l].cost).text.length).toBeGreaterThan(0);
});

test('fire-rate aura scales the DPS gain; wave surcharge changes dps per coin only', () => {
  const plain = upgradeDelta(def('ar_turret'), 1, 40);
  const buffed = upgradeDelta(def('ar_turret'), 1, 40, 0.1);
  expect(buffed.dDps).toBeCloseTo(plain.dDps * 1.1);
  const surcharge = upgradeDelta(def('ar_turret'), 1, 46);
  expect(surcharge.dDps).toBeCloseTo(plain.dDps);
  expect(surcharge.dpsPerCoin).toBeLessThan(plain.dpsPerCoin);
});

test('support towers report aura deltas', () => {
  expect(upgradeDelta(def('ammo_feeder'), 1, 110).text).toContain('% rate aura');
});

test('card info: air flag, DPS and specials', () => {
  const aa = towerCardInfo(def('aa_mg'));
  expect(aa.air).toBe(true);
  expect(towerCardInfo(def('ar_turret')).air).toBe(false);
  const ar = towerCardInfo(def('ar_turret'));
  expect(ar.dps).toBeCloseTo(16);
  expect(ar.role.length).toBeGreaterThan(0);
  expect(levelSpecial(def('ammo_feeder'), def('ammo_feeder').levels[0]).join(' ')).toContain('Aura');
});
