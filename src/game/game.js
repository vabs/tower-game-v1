import { stepFixed } from '../core/time.js';

export function createGame({ renderer }) {
  const state = {
    time: 0,
    tick: 0,
  };

  function update(dt) {
    const ticks = stepFixed(dt, 1 / 60);
    state.tick += ticks;
    state.time += dt;
  }

  function render() {
    renderer.clear();
    renderer.text('Initializing battlefield...', 24, 28);
  }

  return { state, update, render };
}
