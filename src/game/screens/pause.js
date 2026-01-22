import { summarizeTowerStats, summarizeEnemyStats } from '../../ui/analytics.js';

export function renderPauseScreen({ towers = [], enemies = [] } = {}) {
  return {
    title: 'Paused',
    actions: ['resume', 'restart', 'options', 'quit'],
    analytics: {
      towers: summarizeTowerStats(towers),
      enemies: summarizeEnemyStats(enemies),
    },
  };
}
