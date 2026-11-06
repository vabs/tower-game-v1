import { test, expect } from 'vitest';
import { routeKey, sellDecision, nextTargeting, nextTowerId, CONTROLS } from '../src/ui/hotkeys.js';
import { getTowerDef } from '../src/sim/towers.js';

const play = { screen: 'playing' };
const key = (k, extra = {}) => routeKey({ key: k, ...extra }, play);

test('key mapping while playing', () => {
  expect(key(' ')).toEqual({ type: 'startWave' });
  expect(key('u')).toEqual({ type: 'upgrade' });
  expect(key('U')).toEqual({ type: 'upgrade' });
  expect(key('s')).toEqual({ type: 'sell' });
  expect(key('Delete')).toEqual({ type: 'sell' });
  expect(key('t')).toEqual({ type: 'cycleTarget' });
  expect(key('Tab')).toEqual({ type: 'selectNext', reverse: false });
  expect(key('Tab', { shiftKey: true }).reverse).toBe(true);
  expect(key('2')).toEqual({ type: 'speed', value: 2 });
  expect(key('Escape')).toEqual({ type: 'escape' });
  expect(key('x')).toBeNull();
});

test('modifiers, other screens and sandbox-only keys', () => {
  expect(key('u', { ctrlKey: true })).toBeNull();
  expect(key('s', { metaKey: true })).toBeNull();
  expect(routeKey({ key: ' ' }, { screen: 'paused' })).toBeNull();
  expect(routeKey({ key: 'Escape' }, { screen: 'paused' })).toEqual({ type: 'escape' });
  expect(key('n')).toBeNull();
  expect(routeKey({ key: 'n' }, { screen: 'playing', sandbox: true })).toEqual({ type: 'spawnTest' });
});

test('sell: instant in build phase, double press within 1.5s in a wave', () => {
  expect(sellDecision(null, 5, 0, false)).toEqual({ sell: true, pending: null });
  const first = sellDecision(null, 5, 1000, true);
  expect(first.sell).toBe(false);
  expect(sellDecision(first.pending, 5, 2400, true).sell).toBe(true);
  expect(sellDecision(first.pending, 5, 2600, true).sell).toBe(false); // too late, re-arms
  expect(sellDecision(first.pending, 6, 1200, true).sell).toBe(false); // other tower
});

test('targeting cycle and tower cycling', () => {
  const ar = { def: getTowerDef('ar_turret'), targeting: 'first' };
  expect(nextTargeting(ar)).toBe('last');
  expect(nextTargeting({ ...ar, targeting: 'strongest' })).toBe('first');
  const aa = { def: getTowerDef('aa_mg'), targeting: 'strongest' };
  expect(nextTargeting(aa)).toBe('air');
  expect(nextTargeting({ ...aa, targeting: 'air' })).toBe('first');
  const ts = [{ id: 7 }, { id: 3 }, { id: 9 }];
  expect(nextTowerId(ts, null)).toBe(3);
  expect(nextTowerId(ts, 3)).toBe(7);
  expect(nextTowerId(ts, 9)).toBe(3);
  expect(nextTowerId(ts, 3, true)).toBe(9);
  expect(nextTowerId([], null)).toBeNull();
  expect(CONTROLS.length).toBeGreaterThan(8);
});

test('M toggles mute on every screen, but not with modifiers', () => {
  for (const screen of ['playing', 'paused', 'start', 'level-select', 'level-complete']) {
    expect(routeKey({ key: 'm' }, { screen })).toEqual({ type: 'mute' });
    expect(routeKey({ key: 'M' }, { screen })).toEqual({ type: 'mute' });
  }
  expect(routeKey({ key: 'm', metaKey: true }, play)).toBeNull();
  expect(CONTROLS.some(([k]) => k === 'M')).toBe(true);
});
