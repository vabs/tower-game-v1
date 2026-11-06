import { test, expect } from 'vitest';
import { towers } from '../src/data/towers.js';
import { powerOf, upgradeCostsFor, EFFICIENCY } from '../tools/upgrade-costs.mjs';

test('every upgrade buys 75-100% of the power per coin of a fresh L1 of the same tower', () => {
  for (const def of towers) {
    const lv1 = def.levels[0];
    const base = powerOf(lv1, lv1) / lv1.cost;
    for (let i = 1; i < def.levels.length; i++) {
      const dp = powerOf(def.levels[i], lv1) - powerOf(def.levels[i - 1], lv1);
      const eff = dp / def.levels[i].cost / base;
      expect(eff, `${def.id} L${i + 1}`).toBeGreaterThanOrEqual(0.75);
      expect(eff, `${def.id} L${i + 1}`).toBeLessThanOrEqual(1.0);
    }
  }
});

test('cost data matches the generator formula (run tools/upgrade-costs.mjs --write)', () => {
  expect(EFFICIENCY).toBeGreaterThan(0.75);
  for (const def of towers) expect(def.levels.map((l) => l.cost), def.id).toEqual(upgradeCostsFor(def));
});
