import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTowerStats } from '../src/ui/analytics.js';

test('summarizes tower damage and kills', () => {
  const stats = summarizeTowerStats([{ id: 'ar', damage: 120, kills: 3, cost: 80 }]);
  assert.equal(stats[0].dpc, 1.5);
});
