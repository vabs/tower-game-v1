import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStateMachine } from '../src/game/state.js';

test('state transitions are allowed', () => {
  const sm = createStateMachine();
  sm.transition('playing');
  assert.equal(sm.current, 'playing');
  sm.transition('paused');
  assert.equal(sm.current, 'paused');
});
