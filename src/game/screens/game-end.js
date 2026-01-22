import { summarizeTowerStats, summarizeEnemyStats } from '../../ui/analytics.js';

export function renderGameEnd({ towers = [], enemies = [] } = {}) {
  return {
    title: 'Campaign Complete',
    actions: ['level-select', 'restart'],
    analytics: {
      towers: summarizeTowerStats(towers),
      enemies: summarizeEnemyStats(enemies),
    },
  };
}
