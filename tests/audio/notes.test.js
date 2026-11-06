import { test, expect } from 'vitest';
import { parseNote, midiToFreq, parsePattern, tokenize } from '../../src/audio/notes.js';

test('parseNote reads scientific pitch', () => {
  expect(parseNote('C4')).toBe(60);
  expect(parseNote('A4')).toBe(69);
  expect(parseNote('F#3')).toBe(54);
  expect(parseNote('Bb2')).toBe(46);
  expect(parseNote('C-1')).toBe(0);
  for (const bad of ['H4', 'C', '4C', 'c4', 'C#', 'x', '.', '-', '']) expect(parseNote(bad)).toBeNull();
});

test('midiToFreq', () => {
  expect(midiToFreq(69)).toBeCloseTo(440);
  expect(midiToFreq(57)).toBeCloseTo(220);
  expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
});

test('tokenize accepts a string or an array of bars', () => {
  expect(tokenize('C4  . \n E4')).toEqual(['C4', '.', 'E4']);
  expect(tokenize(['C4 .', 'E4 -'])).toEqual(['C4', '.', 'E4', '-']);
  expect(() => tokenize(5)).toThrow();
});

test('note patterns: rests, holds extend the previous note, chords', () => {
  const { steps, events } = parsePattern('C4 . E4 - - . A3+C4+E4 -');
  expect(steps).toBe(8);
  expect(events).toEqual([
    { step: 0, len: 1, midis: [60], accent: false },
    { step: 2, len: 3, midis: [64], accent: false },
    { step: 6, len: 2, midis: [57, 60, 64], accent: false },
  ]);
});

test('drum patterns use x / X', () => {
  const { events } = parsePattern('x . X .', 'drum');
  expect(events.map((e) => [e.step, e.accent])).toEqual([[0, false], [2, true]]);
  expect(() => parsePattern('C4 x', 'drum')).toThrow(/drum/);
});

test('bad tokens and orphan holds throw', () => {
  expect(() => parsePattern('C4 Q9')).toThrow(/bad note/);
  expect(() => parsePattern('- C4')).toThrow(/nothing to hold/);
  expect(() => parsePattern('C4 . -')).toThrow(/nothing to hold/);
  expect(() => parsePattern('x -', 'drum')).toThrow(/nothing to hold/);
});
