import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUnlocksForLevel } from '../src/data/levels.js';

test('unlocks are defined', () => {
  const unlocks = getUnlocksForLevel(6);
  assert.ok(unlocks.length > 0);
});
