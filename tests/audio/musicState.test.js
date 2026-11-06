import { test, expect } from 'vitest';
import { musicPlan, battleTrackFor, isBossWave } from '../../src/audio/musicState.js';

const world = (phase, waveIndex = 0, bossAt = -1) => ({
  phase, waveIndex,
  waves: [0, 1, 2].map((i) => ({ enemies: [{ id: i === bossAt ? 'tank_boss' : 'grunt', count: 3 }] })),
});

test('menus play the menu track', () => {
  expect(musicPlan('start', null)).toMatchObject({ track: 'menu', duck: false });
  expect(musicPlan('level-select', null).track).toBe('menu');
});

test('build phase / countdown -> build, wave -> battle, boss wave -> boss', () => {
  expect(musicPlan('playing', world('build')).track).toBe('build');
  expect(musicPlan('playing', world('wave', 1)).track).toBe('battle');
  expect(musicPlan('playing', world('wave', 2, 2)).track).toBe('boss');
  expect(musicPlan('playing', world('build', 2, 2)).track).toBe('build'); // countdown before the boss wave is still calm
  expect(isBossWave(world('wave', 2, 2))).toBe(true);
  expect(isBossWave(world('wave', 1, 2))).toBe(false);
});

test('pause keeps the track and ducks it', () => {
  expect(musicPlan('paused', world('wave', 1))).toEqual({ track: 'battle', duck: true });
});

test('won / lost sim phases hold the current music until the screen changes', () => {
  expect(musicPlan('playing', world('won'))).toMatchObject({ track: null, hold: true });
  expect(battleTrackFor(world('lost'))).toBeNull();
});

test('end screens fire stings', () => {
  expect(musicPlan('level-complete', world('won'))).toMatchObject({ sting: 'victory', then: 'menu' });
  expect(musicPlan('game-end', world('won'))).toMatchObject({ sting: 'victory', then: 'menu' });
  expect(musicPlan('game-over', world('lost'))).toMatchObject({ sting: 'defeat', then: null });
});
