import { summarizeTowerStats, summarizeEnemyStats } from '../../ui/analytics.js';

export function renderGameOver({ towers = [], enemies = [] } = {}) {
  return {
    title: 'Game Over',
    actions: ['retry', 'level-select'],
    analytics: {
      towers: summarizeTowerStats(towers),
      enemies: summarizeEnemyStats(enemies),
    },
  };
}
