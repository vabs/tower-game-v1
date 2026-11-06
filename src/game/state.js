/** Screen/game flow. `playing` is the only state in which the sim is stepped. */
export const TRANSITIONS = {
  start: ['level-select', 'playing'],
  'level-select': ['start', 'playing'],
  playing: ['paused', 'level-complete', 'game-over', 'game-end', 'playing'],
  paused: ['playing', 'level-select', 'start'],
  'level-complete': ['playing', 'level-select', 'game-end'],
  'game-over': ['playing', 'level-select'],
  'game-end': ['start', 'level-select', 'playing'],
};

export function createStateMachine(initial = 'start') {
  if (!TRANSITIONS[initial]) throw new Error(`Invalid state ${initial}`);
  return {
    current: initial,
    can(next) {
      return TRANSITIONS[this.current].includes(next);
    },
    transition(next) {
      if (!TRANSITIONS[next]) throw new Error(`Invalid state ${next}`);
      if (!this.can(next)) throw new Error(`Invalid transition ${this.current} -> ${next}`);
      this.current = next;
    },
  };
}
