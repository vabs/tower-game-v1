import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSupplyDropLevel, totalWavesWithSupply } from '../src/systems/waves.js';

test('supply drop levels add an extra wave', () => {
  assert.equal(isSupplyDropLevel(12), true);
  assert.equal(totalWavesWithSupply(12, 6), 7);
});
