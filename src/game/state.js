export function createStateMachine() {
  const allowed = new Set([
    'start',
    'level-select',
    'playing',
    'paused',
    'game-over',
    'game-end',
  ]);
  return {
    current: 'start',
    transition(next) {
      if (!allowed.has(next)) throw new Error('Invalid state');
      this.current = next;
    },
  };
}
