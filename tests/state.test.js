import { test, expect } from 'vitest';
import { createStateMachine } from '../src/game/state.js';

const run = (sm, ...states) => states.forEach((s) => sm.transition(s));

test('starts on the start screen', () => {
  expect(createStateMachine().current).toBe('start');
  expect(createStateMachine('playing').current).toBe('playing');
});

test('full campaign loop', () => {
  const sm = createStateMachine();
  run(sm, 'level-select', 'playing', 'paused', 'playing', 'level-complete', 'playing', 'game-over', 'playing', 'game-over', 'level-select', 'start');
  expect(sm.current).toBe('start');
});

test('pause menu exits and restart', () => {
  const sm = createStateMachine('playing');
  run(sm, 'paused', 'level-select');
  expect(sm.current).toBe('level-select');
  sm.transition('playing');
  sm.transition('playing'); // restart while playing
  run(sm, 'paused', 'start');
  expect(sm.current).toBe('start');
});

test('clearing level 50 goes to game end then back out', () => {
  const sm = createStateMachine('playing');
  sm.transition('game-end');
  expect(sm.can('start')).toBe(true);
  expect(sm.can('level-select')).toBe(true);
});

test('invalid transitions are rejected', () => {
  const sm = createStateMachine();
  expect(() => sm.transition('paused')).toThrow();
  expect(() => sm.transition('level-complete')).toThrow();
  expect(() => sm.transition('nope')).toThrow();
  expect(sm.current).toBe('start');
  const g = createStateMachine('playing');
  g.transition('game-over');
  expect(() => g.transition('paused')).toThrow();
  expect(() => g.transition('level-complete')).toThrow();
  expect(g.can('playing')).toBe(true);
});
