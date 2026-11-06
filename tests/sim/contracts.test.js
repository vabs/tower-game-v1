import { test, expect } from 'vitest';
import { createWorld } from '../../src/sim/world.js';
import { placeTower, upgradeTower, sellTower } from '../../src/sim/commands.js';
import { towers } from '../../src/data/towers.js';
import { levels } from '../../src/data/levels.js';
import { contractFor, contractPool, evaluateContract, contractResult, levelHasAir, towerLimitFor, CONTRACT_KINDS } from '../../src/sim/contracts.js';
import { freshSave, recordClear, normalizeSave, summarizeCampaign } from '../../src/core/save.js';

const rich = (level = 1) => createWorld(level, { unlocked: towers.map((t) => t.id), coins: 99999 });
const tracker = (over = {}) => ({ placed: 0, families: [], maxLevel: 0, sold: 0, usedAntiAir: false, ...over });

test('every level has exactly one deterministic, valid contract', () => {
  const seen = new Set();
  for (let l = 1; l <= levels.length; l++) {
    const c = contractFor(l);
    expect(c).toEqual(contractFor(l));
    expect(CONTRACT_KINDS).toContain(c.kind);
    expect(contractPool(l)).toContain(c.kind);
    expect(c.label.length).toBeGreaterThan(3);
    seen.add(c.kind);
  }
  expect(seen.size).toBe(CONTRACT_KINDS.length); // the whole pool gets used
});

test('"win without Anti-Air" is only offered on levels without air units', () => {
  for (let l = 1; l <= levels.length; l++) {
    if (contractFor(l).kind === 'noAntiAir') expect(levelHasAir(l)).toBe(false);
  }
  expect(levelHasAir(1)).toBe(false);
  expect(levelHasAir(20)).toBe(true);
  expect(contractPool(20)).not.toContain('noAntiAir');
});

test('tower limit grows with level and stays between 6 and 15', () => {
  expect(towerLimitFor(1)).toBe(6);
  expect(towerLimitFor(50)).toBe(15);
  for (let l = 2; l <= 50; l++) expect(towerLimitFor(l)).toBeGreaterThanOrEqual(towerLimitFor(l - 1));
});

test('evaluateContract per kind', () => {
  expect(evaluateContract({ kind: 'maxTowers', n: 6 }, tracker({ placed: 6 }))).toBe(true);
  expect(evaluateContract({ kind: 'maxTowers', n: 6 }, tracker({ placed: 7 }))).toBe(false);
  expect(evaluateContract({ kind: 'maxFamilies', n: 2 }, tracker({ families: ['a', 'b'] }))).toBe(true);
  expect(evaluateContract({ kind: 'maxFamilies', n: 2 }, tracker({ families: ['a', 'b', 'c'] }))).toBe(false);
  expect(evaluateContract({ kind: 'maxUpgradeLevel', n: 3 }, tracker({ maxLevel: 3 }))).toBe(true);
  expect(evaluateContract({ kind: 'maxUpgradeLevel', n: 3 }, tracker({ maxLevel: 4 }))).toBe(false);
  expect(evaluateContract({ kind: 'noSelling' }, tracker())).toBe(true);
  expect(evaluateContract({ kind: 'noSelling' }, tracker({ sold: 1 }))).toBe(false);
  expect(evaluateContract({ kind: 'noAntiAir' }, tracker())).toBe(true);
  expect(evaluateContract({ kind: 'noAntiAir' }, tracker({ usedAntiAir: true }))).toBe(false);
  expect(evaluateContract(null, tracker())).toBe(false);
});

test('the sim tracks placements, families, upgrades, sales and anti-air', () => {
  const w = rich();
  const spot = [];
  for (let ty = 0; ty < w.map.h && spot.length < 4; ty++) for (let tx = 0; tx < w.map.w && spot.length < 4; tx++) if (w.map.buildable(tx, ty)) spot.push([tx, ty]);
  const a = placeTower(w, 'ar_turret', ...spot[0]).tower;
  placeTower(w, 'marksman_tower', ...spot[1]);
  expect(w.stats.contract.placed).toBe(2);
  expect(w.stats.contract.families.length).toBe(2);
  expect(w.stats.contract.usedAntiAir).toBe(false);
  upgradeTower(w, a.id);
  upgradeTower(w, a.id);
  upgradeTower(w, a.id);
  expect(w.stats.contract.maxLevel).toBe(4);
  sellTower(w, a.id);
  expect(w.stats.contract.sold).toBe(1);
  expect(w.stats.contract.placed).toBe(2); // selling does not refund the "towers built" count
  placeTower(w, 'aa_mg', ...spot[2]);
  expect(w.stats.contract.usedAntiAir).toBe(true);
});

test('contractResult needs a win', () => {
  const w = createWorld(1);
  expect(contractResult(w)).toBe(false);
  w.phase = 'won';
  expect(contractResult(w)).toBe(evaluateContract(contractFor(1), w.stats.contract));
});

test('save keeps completed contracts, ignores junk, counts them', () => {
  const s = freshSave();
  expect(s.contracts).toEqual({});
  recordClear(s, 3, 'gold', { contract: true });
  recordClear(s, 4, 'gold', { contract: false });
  recordClear(s, 3, 'bronze', { contract: false }); // never un-completes
  expect(s.contracts).toEqual({ 3: true });
  expect(summarizeCampaign(s).contracts).toBe(1);
  const n = normalizeSave(JSON.parse(JSON.stringify({ ...s, contracts: { 3: true, 99: true, x: true, 5: 'yes' } })));
  expect(n.contracts).toEqual({ 3: true });
  expect(normalizeSave({ version: 1 }).contracts).toEqual({});
});
