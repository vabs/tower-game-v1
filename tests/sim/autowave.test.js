import { test, expect } from 'vitest';
import { createWorld, step, STEP } from '../../src/sim/world.js';
import { startWave } from '../../src/sim/commands.js';

/** Kill everything on the field each step so waves end quickly. */
function stepClearing(world, maxSteps = 60 * 600, until = () => false) {
  for (let i = 0; i < maxSteps && !until(world); i++) {
    for (const e of world.enemies) e.hp = 0, e.dead = true;
    step(world, STEP);
  }
}

test('auto-wave does not start the first wave by itself', () => {
  const w = createWorld(1, { seed: 1, autoWave: true });
  for (let i = 0; i < 60 * 30; i++) step(w, STEP);
  expect(w.phase).toBe('build');
  expect(w.waveIndex).toBe(0);
});

test('auto-wave calls the next wave the moment the previous one is cleared', () => {
  const w = createWorld(1, { seed: 1, autoWave: true });
  startWave(w);
  const starts = [];
  for (let i = 0; i < 60 * 600 && w.phase !== 'won'; i++) {
    for (const e of w.enemies) e.hp = 0, e.dead = true;
    w.events.length = 0;
    step(w, STEP);
    if (w.events.some((e) => e.type === 'waveEnd')) {
      // the build phase may last at most one step before the next wave begins
      w.events.length = 0;
      step(w, STEP);
      expect(w.phase === 'wave' || w.phase === 'won').toBe(true);
      starts.push(w.waveIndex);
    }
  }
  expect(w.phase).toBe('won');
  expect(starts.length).toBe(w.waves.length);
});

test('without auto-wave the countdown runs before the next wave', () => {
  const w = createWorld(1, { seed: 1 });
  startWave(w);
  stepClearing(w, 60 * 600, (x) => x.waveIndex === 1);
  expect(w.phase).toBe('build');
  expect(w.countdown).toBeGreaterThan(0);
});

test('turning auto-wave on during a countdown starts the next wave on the next step', () => {
  const w = createWorld(1, { seed: 1 });
  startWave(w);
  stepClearing(w, 60 * 600, (x) => x.waveIndex === 1);
  expect(w.phase).toBe('build');
  w.autoWave = true;
  step(w, STEP);
  expect(w.phase).toBe('wave');
});
