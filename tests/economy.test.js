import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stipendForLevel, upgradeCost } from '../src/systems/economy.js';

test('stipend scales with level', () => {
  assert.equal(stipendForLevel(1), 10);
  assert.equal(stipendForLevel(10), 15);
});

test('in-combat upgrades cost +15%', () => {
  assert.equal(upgradeCost(100, true), 115);
  assert.equal(upgradeCost(100, false), 100);
});
