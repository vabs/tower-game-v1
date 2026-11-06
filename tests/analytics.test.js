import { test, expect } from 'vitest';
import { summarizeTowerStats, summarizeEnemyStats } from '../src/ui/analytics.js';

test('tower rows: damage per coin, names, sorted by damage', () => {
  const rows = summarizeTowerStats([
    { id: 1, typeId: 'ar_turret', damage: 120, kills: 3, spent: 80 },
    { id: 2, typeId: 'mortar', damage: 300.4, kills: 5, spent: 0 },
  ]);
  expect(rows.map((r) => r.id)).toEqual([2, 1]);
  expect(rows[1]).toMatchObject({ name: 'AR Turret', dpc: 1.5, damage: 120 });
  expect(rows[0].dpc).toBe(0);
  expect(rows[0].damage).toBe(300);
});

test('enemy rows: only seen types, with hp/speed from data, bosses resolved', () => {
  const rows = summarizeEnemyStats({
    grunt: { seen: 4, killed: 3, leaked: 1 },
    heavy_boss: { seen: 1, killed: 0, leaked: 0 },
    runner: { seen: 0, killed: 0, leaked: 0 },
  });
  expect(rows.map((r) => r.id)).toEqual(['grunt', 'heavy_boss']);
  expect(rows[0]).toMatchObject({ name: 'Grunt', hp: 80, speed: 1, seen: 4, killed: 3, leaked: 1, type: 'ground' });
  expect(rows[1]).toMatchObject({ boss: true, sprite: 'bosses/heavy_boss' });
  expect(summarizeEnemyStats({})).toEqual([]);
});
