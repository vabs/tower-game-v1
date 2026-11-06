/**
 * Music data. Tracks are plain objects, so music can be written or changed here without touching engine code.
 *
 * @typedef {object} Track
 * @property {string}  id           unique name used by the game ('menu', 'build', 'battle', 'boss', 'victory', ...)
 * @property {number}  bpm          tempo in beats per minute (30..300). Never follows game speed.
 * @property {number}  stepsPerBeat grid resolution: 4 = sixteenth notes. One pattern token = one step.
 * @property {number}  bars         length in bars; a bar is 4 beats unless `beatsPerBar` is given.
 * @property {boolean} loop         true: repeats forever; false: a sting that plays once.
 * @property {number}  [beatsPerBar] default 4
 * @property {Channel[]} channels   all channels play together
 *
 * @typedef {object} Channel
 * @property {'lead'|'pulse'|'bass'|'pad'|'kick'|'snare'|'hat'} instrument
 * @property {number} volume        0 < volume <= 1 (mixing level of this channel)
 * @property {string|string[]} pattern  exactly bars x beats x stepsPerBeat whitespace separated tokens, as one
 *                                  string or an array of strings (e.g. one per bar):
 *     '.'        rest (silence)
 *     '-'        hold: extends the previous note over this step (the note is not retriggered)
 *     'C4' 'F#3' 'Bb2'   note, scientific pitch (C4 = middle C, A4 = 440 Hz); note instruments only
 *     'A3+C4+E4' chord (notes joined by '+'); mostly for 'pad'
 *     'x' / 'X'  drum hit / accented hit; drum instruments (kick, snare, hat) only
 *
 * Example (1 bar of 4/4 at 16 steps):
 *   { id: 'demo', bpm: 120, stepsPerBeat: 4, bars: 1, loop: true, channels: [
 *       { instrument: 'lead', volume: 0.3, pattern: 'C4 . E4 . G4 - - . C5 - - - . . . .' },
 *       { instrument: 'kick', volume: 0.6, pattern: 'x . . . x . . . x . . . x . . .' } ] }
 */

const HOLD16 = '- - - - - - - - - - - - - - - -';
/** A chord held for one 16-step bar. */
const hold = (chord) => `${chord} ${HOLD16.slice(0, -2)}`;
/** Bar of eighth-note pulses on `root`, ending on `top` (e.g. octave up). */
const eighths = (root, top = root) => `${Array(7).fill(`${root} .`).join(' ')} ${top} .`;
/** Bar of root/fifth half-note march. */
const march = (root, fifth) => `${root} - - - ${fifth} - - - ${root} - - - ${fifth} - - -`;
/** Slow arpeggio r-3-5-3 on sixteenth-note gaps. */
const arp = (a, b, c) => `${a} . ${b} . ${c} . ${b} . ${a} . ${b} . ${c} . ${b} .`;
const rep = (bar, n) => Array(n).fill(bar);

const KICK_MARCH = 'x . . . . . . . x . . . . . . .';
const SNARE_MARCH = '. . . . x . . . . . . . x . x x';

const menu = {
  id: 'menu', bpm: 92, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.5, pattern: rep(KICK_MARCH, 8) },
    { instrument: 'snare', volume: 0.3, pattern: rep(SNARE_MARCH, 8) },
    { instrument: 'bass', volume: 0.45, pattern: [
      march('A2', 'E2'), march('A2', 'E2'), march('F2', 'C3'), march('G2', 'D3'),
      march('A2', 'E2'), march('F2', 'C3'), march('G2', 'D3'), march('E2', 'B2')] },
    { instrument: 'pad', volume: 0.16, pattern: [
      hold('A3+C4+E4'), hold('A3+C4+E4'), hold('F3+A3+C4'), hold('G3+B3+D4'),
      hold('A3+C4+E4'), hold('F3+A3+C4'), hold('G3+B3+D4'), hold('E3+G#3+B3')] },
    { instrument: 'lead', volume: 0.26, pattern: [
      'E4 - - . A4 - - . C5 - - . B4 - A4 -',
      'E4 - - - . . . . A4 - E4 - C4 - - .',
      'F4 - - . A4 - - . C5 - - . A4 - F4 -',
      'G4 - - . B4 - - . D5 - - - . . . .',
      'E5 - - . D5 - C5 - B4 - - . C5 - - .',
      'A4 - - . C5 - - . F5 - - . E5 - D5 -',
      'D5 - - . B4 - - . G4 - - . B4 - D5 -',
      'E5 - - - - - - - G#4 - - . B4 - - .'] },
  ],
};

const build = {
  id: 'build', bpm: 80, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.3, pattern: rep('x . . . . . . . . . . . . . . .', 8) },
    { instrument: 'hat', volume: 0.12, pattern: rep('. . . . x . . . . . . . x . . .', 8) },
    { instrument: 'bass', volume: 0.38, pattern: [
      'D2 - - - - - - - A2 - - - - - - -', 'Bb1 - - - - - - - F2 - - - - - - -',
      'F2 - - - - - - - C3 - - - - - - -', 'C2 - - - - - - - G2 - - - - - - -',
      'D2 - - - - - - - A2 - - - - - - -', 'Bb1 - - - - - - - F2 - - - - - - -',
      'G2 - - - - - - - D3 - - - - - - -', 'A1 - - - - - - - E2 - - - - - - -'] },
    { instrument: 'pad', volume: 0.18, pattern: [
      hold('D3+F3+A3'), hold('Bb2+D3+F3'), hold('F3+A3+C4'), hold('C3+E3+G3'),
      hold('D3+F3+A3'), hold('Bb2+D3+F3'), hold('G3+Bb3+D4'), hold('A2+C#3+E3')] },
    { instrument: 'pulse', volume: 0.1, pattern: [
      arp('D4', 'F4', 'A4'), arp('Bb3', 'D4', 'F4'), arp('F4', 'A4', 'C5'), arp('E4', 'G4', 'C5'),
      arp('D4', 'F4', 'A4'), arp('Bb3', 'D4', 'F4'), arp('G4', 'Bb4', 'D5'), arp('C#4', 'E4', 'A4')] },
  ],
};

const battle = {
  id: 'battle', bpm: 140, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.6, pattern: rep('x . . . x . . . x . . . x . . .', 8) },
    { instrument: 'snare', volume: 0.38, pattern: rep('. . . . x . . . . . . . x . . x', 8) },
    { instrument: 'hat', volume: 0.16, pattern: rep('x . x . x . x . x . x . x . x X', 8) },
    { instrument: 'bass', volume: 0.5, pattern: [
      eighths('E2', 'E3'), eighths('E2', 'E3'), eighths('C3', 'C2'), eighths('D3', 'D2'),
      eighths('E2', 'E3'), eighths('C3', 'C2'), eighths('D3', 'D2'), eighths('B2', 'B1')] },
    { instrument: 'pad', volume: 0.1, pattern: [
      hold('E3+G3+B3'), hold('E3+G3+B3'), hold('C3+E3+G3'), hold('D3+F#3+A3'),
      hold('E3+G3+B3'), hold('C3+E3+G3'), hold('D3+F#3+A3'), hold('B2+D#3+F#3')] },
    { instrument: 'lead', volume: 0.22, pattern: [
      'E5 . . E5 . G5 . . B4 . . . E5 . . .',
      'D5 . . B4 . G4 . . A4 . B4 . D5 . . .',
      'C5 . . C5 . E5 . . G4 . . . C5 . . .',
      'D5 . . D5 . F#5 . . A4 . . . D5 . E5 F#5',
      'E5 . . E5 . G5 . . B4 . . . E5 . . .',
      'E5 . D5 . C5 . . . G4 . A4 . C5 . . .',
      'F#5 . E5 . D5 . . . A4 . B4 . D5 . . .',
      'B4 . . B4 . D#5 . . F#5 . . . B5 . . .'] },
  ],
};

const boss = {
  id: 'boss', bpm: 150, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.65, pattern: rep('x . . x . . x . x . . x . . x .', 8) },
    { instrument: 'snare', volume: 0.42, pattern: rep('. . . . x . . . . . . . x . x .', 8) },
    { instrument: 'hat', volume: 0.16, pattern: rep('x x x x x x x x x x x x x x x X', 8) },
    { instrument: 'bass', volume: 0.52, pattern: [
      'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .', 'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .',
      'Eb2 . Eb2 Eb2 . Eb2 Eb2 . Eb2 . Eb2 Eb2 . Eb2 Eb2 .', 'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .',
      'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .', 'Bb2 . Bb2 Bb2 . Bb2 Bb2 . Bb2 . Bb2 Bb2 . Bb2 Bb2 .',
      'C#3 . C#3 C#3 . C#3 C#3 . C#3 . C#3 C#3 . C#3 C#3 .', 'A2 . A2 A2 . A2 A2 . A2 . A2 A2 . A2 A2 .'] },
    { instrument: 'pad', volume: 0.12, pattern: [
      hold('D3+Ab3'), hold('D3+A3+Eb4'), hold('Eb3+Bb3'), hold('D3+Ab3'),
      hold('D3+Ab3'), hold('Bb2+F3+Db4'), hold('C#3+G3+Bb3'), hold('A2+Eb3+G3')] },
    { instrument: 'lead', volume: 0.24, pattern: [
      'D5 . D5 . . D5 . . A4 . . . Ab4 . . .',
      'D5 . D5 . . D5 . . F5 . E5 . D5 . . .',
      'Eb5 . Eb5 . . Eb5 . . Bb4 . . . A4 . . .',
      'D5 . D5 . . D5 . . A4 . Ab4 . A4 . D5 .',
      'D5 . D5 . . D5 . . A4 . . . Ab4 . . .',
      'Bb4 . Bb4 . . D5 . . F5 . . . E5 . . .',
      'C#5 . C#5 . . E5 . . G5 . . . F5 . E5 .',
      'A5 . . . G5 . . . F5 . . . E5 . . .'] },
  ],
};

const victory = {
  id: 'victory', bpm: 120, stepsPerBeat: 4, bars: 2, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.3, pattern: [
      'C5 . E5 . G5 . G5 . C6 - - - - - - -',
      'E5 - G5 - C6 - - - E6 - - - - - - -'] },
    { instrument: 'bass', volume: 0.45, pattern: ['C3 - - - - - - - G2 - - - C3 - - -', 'C3 - - - - - - - - - - - - - - -'] },
    { instrument: 'pad', volume: 0.18, pattern: [hold('C4+E4+G4'), hold('C4+E4+G4')] },
    { instrument: 'kick', volume: 0.5, pattern: ['x . . . x . . . x . . . x . . .', 'x . . . . . . . . . . . . . . .'] },
    { instrument: 'snare', volume: 0.3, pattern: ['. . . . x . . . . . . . x . x x', 'x . . . . . . . . . . . . . . .'] },
  ],
};

const defeat = {
  id: 'defeat', bpm: 80, stepsPerBeat: 4, bars: 2, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.28, pattern: [
      'A4 - - - G4 - - - F4 - - - E4 - - -',
      'D4 - - - - - - - - - - - - - - -'] },
    { instrument: 'bass', volume: 0.45, pattern: ['A2 - - - - - - - - - - - - - - -', 'D2 - - - - - - - - - - - - - - -'] },
    { instrument: 'pad', volume: 0.2, pattern: [hold('A3+C4+E4'), hold('D3+F3+A3')] },
    { instrument: 'kick', volume: 0.45, pattern: ['x . . . . . . . . . . . x . . .', 'x . . . . . . . . . . . . . . .'] },
  ],
};

const waveStart = {
  id: 'waveStart', bpm: 140, stepsPerBeat: 4, bars: 1, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.26, pattern: ['E4 . E4 . B4 - - - E5 - - - - - - -'] },
    { instrument: 'snare', volume: 0.3, pattern: ['x . x . x . x x . . . . . . . .'] },
    { instrument: 'kick', volume: 0.5, pattern: ['x . . . . . . . x . . . . . . .'] },
  ],
};

const bossAlert = {
  id: 'bossAlert', bpm: 150, stepsPerBeat: 4, bars: 2, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.3, pattern: [
      'D5 - - - Ab5 - - - D5 - - - Ab5 - - -',
      'D5 - - - Ab5 - - - D5 - - - - - - -'] },
    { instrument: 'bass', volume: 0.5, pattern: [hold('D2'), hold('D2')] },
    { instrument: 'pad', volume: 0.16, pattern: [hold('D3+Ab3'), hold('D3+Ab3')] },
    { instrument: 'snare', volume: 0.3, pattern: ['. . . . . . . . x . x . x x x x', 'x . . . . . . . . . . . . . . .'] },
    { instrument: 'kick', volume: 0.55, pattern: ['x . . . x . . . x . . . x . . .', 'x . . . . . . . . . . . . . . .'] },
  ],
};

/** @type {Record<string, Track>} */
export const TRACKS = Object.fromEntries([menu, build, battle, boss, victory, defeat, waveStart, bossAlert].map((t) => [t.id, t]));
