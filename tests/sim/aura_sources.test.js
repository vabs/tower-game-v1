import { test, expect } from 'vitest';
import { sandbox, place } from './helpers.js';
import { auraSourcesFor, auraTargetsOf } from '../../src/sim/auras.js';
import { upgradeTower } from '../../src/sim/commands.js';
import { describeBuffs } from '../../src/ui/towerInfo.js';

test('aura sources and targets reflect range and strongest-wins', () => {
  const w = sandbox();
  const feeder = place(w, 'ammo_feeder', 7, 4);
  const ar = place(w, 'ar_turret', 6, 3);
  const far = place(w, 'ar_turret', 12, 3);
  expect(auraTargetsOf(w, feeder).map((t) => t.id)).toEqual([ar.id]);
  expect(auraTargetsOf(w, ar)).toEqual([]);
  const src = auraSourcesFor(w, ar);
  expect(src).toHaveLength(1);
  expect(src[0]).toMatchObject({ name: 'Ammo Feeder', kind: 'fireRate', applied: true });
  expect(auraSourcesFor(w, far)).toEqual([]);
  expect(describeBuffs(src)[0].text).toBe('+8% rate from Ammo Feeder');
  expect(ar.aura.fireRate).toBeCloseTo(0.08);
});

test('a weaker second source is listed but not applied', () => {
  const w = sandbox();
  const ar = place(w, 'ar_turret', 6, 3);
  const f1 = place(w, 'ammo_feeder', 7, 4);
  const f2 = place(w, 'ammo_feeder', 5, 4);
  upgradeTower(w, f2.id);
  const src = auraSourcesFor(w, ar).filter((s) => s.kind === 'fireRate');
  expect(src).toHaveLength(2);
  expect(src.find((s) => s.id === f2.id).applied).toBe(true);
  expect(src.find((s) => s.id === f1.id).applied).toBe(false);
  expect(describeBuffs(src).some((b) => b.text.includes('not applied'))).toBe(true);
});
