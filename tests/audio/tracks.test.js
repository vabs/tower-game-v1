import { test, expect } from 'vitest';
import { TRACKS } from '../../src/audio/tracks.js';
import { validateTrack, totalSteps } from '../../src/audio/trackSchema.js';
import { INSTRUMENT_KINDS, parsePattern } from '../../src/audio/notes.js';
import { INSTRUMENTS } from '../../src/audio/synth.js';
import { compileTrack } from '../../src/audio/music.js';

const REQUIRED = ['menu', 'build', 'battle', 'boss', 'victory', 'defeat', 'waveStart', 'bossAlert'];

test('all required tracks exist, keyed by their id', () => {
  for (const id of REQUIRED) expect(TRACKS[id]?.id).toBe(id);
});

test.each(Object.keys(TRACKS))('track %s is valid (notes, pattern lengths = bars x beats x stepsPerBeat)', (id) => {
  expect(validateTrack(TRACKS[id])).toEqual([]);
  const want = totalSteps(TRACKS[id]);
  for (const ch of TRACKS[id].channels) expect(parsePattern(ch.pattern, INSTRUMENT_KINDS[ch.instrument]).steps).toBe(want);
});

test('loop flags: music loops, stings do not', () => {
  for (const id of ['menu', 'build', 'battle', 'boss']) expect(TRACKS[id].loop).toBe(true);
  for (const id of ['victory', 'defeat', 'waveStart', 'bossAlert']) expect(TRACKS[id].loop).toBe(false);
});

test('every instrument kind has a synth voice and vice versa', () => {
  expect(Object.keys(INSTRUMENTS).sort()).toEqual(Object.keys(INSTRUMENT_KINDS).sort());
});

test('tracks compile to one event list per step', () => {
  const c = compileTrack(TRACKS.battle);
  expect(c.perStep).toHaveLength(totalSteps(TRACKS.battle));
  expect(c.stepDur).toBeCloseTo(60 / 140 / 4);
  expect(c.perStep[0].map((e) => e.instrument)).toContain('kick');
});

test('validator rejects broken tracks', () => {
  const base = { id: 't', bpm: 120, stepsPerBeat: 4, bars: 1, loop: true, channels: [{ instrument: 'lead', volume: 0.3, pattern: 'C4 . . . . . . . . . . . . . . .' }] };
  expect(validateTrack(base)).toEqual([]);
  const withCh = (ch) => ({ ...base, channels: [{ ...base.channels[0], ...ch }] });
  expect(validateTrack(withCh({ pattern: 'C4 .' }))[0]).toMatch(/2 steps, expected 16/);
  expect(validateTrack(withCh({ pattern: 'C4 H9 . . . . . . . . . . . . . .' }))[0]).toMatch(/bad note/);
  expect(validateTrack(withCh({ instrument: 'banjo' }))[0]).toMatch(/unknown instrument/);
  expect(validateTrack(withCh({ instrument: 'kick' }))[0]).toMatch(/drum/);
  expect(validateTrack(withCh({ volume: 2 }))[0]).toMatch(/volume/);
  expect(validateTrack({ ...base, bpm: 5 })[0]).toMatch(/bpm/);
  expect(validateTrack({ ...base, channels: [] })[0]).toMatch(/channel/);
  expect(validateTrack({ ...base, loop: 1 })[0]).toMatch(/loop/);
});
