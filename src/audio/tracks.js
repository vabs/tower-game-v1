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
 * Each array entry below is one complete 4/4 bar (16 steps). Comments mark the phrase and harmony.
 */

const HOLD16 = '- - - - - - - - - - - - - - - -';
/** Hold a chord for one 16-step bar. */
const hold = (chord) => `${chord} ${HOLD16.slice(0, -2)}`;

// D major home; the A phrase is stately, and the B phrase lifts before returning home.
const menu = {
  id: 'menu', bpm: 92, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.48, pattern: [
      'x . . . . . . . x . . . . . . .', // A1
      'x . . . . . . . x . . . . . . .', // A2
      'x . . . . . . . x . . . . . . .', // A3
      'x . . . . . . . x . . . . . . .', // A4
      'x . . . . . . . x . . . . . . .', // B1
      'x . . . . . . . x . . . . . . .', // B2
      'x . . . . . . . x . . . . . . .', // B3
      'x . . . . . . . x . . . . . . .'  // B4
    ] },
    { instrument: 'snare', volume: 0.27, pattern: [
      '. . . . x . . . . . . . x . . .', // A1: straight march
      '. . . . x . . . . . . . x . . .', // A2
      '. . . . x . . . . . . . x . . .', // A3
      '. . . . x . . . . . . . x . x x', // A4: short roll into B
      '. . . . x . . . . . . . x . . .', // B1
      '. . . . x . . . . . . . x . . .', // B2
      '. . . . x . . . . . . . x . . .', // B3
      '. . . . x . . . . . . . x . x x'  // B4: turnaround roll
    ] },
    { instrument: 'bass', volume: 0.38, pattern: [
      'D2 - - - A2 - - - D3 - - - A2 - - -', // A1: D
      'D2 - - - A2 - - - D3 - - - A2 - - -', // A2: D
      'G2 - - - D3 - - - G2 - - - D3 - - -', // A3: G
      'A2 - - - E3 - - - A2 - - - E3 - - -', // A4: A
      'D2 - - - A2 - - - D3 - - - A2 - - -', // B1: D
      'B1 - - - F#2 - - - B2 - - - F#2 - - -', // B2: Bm
      'G2 - - - D3 - - - G2 - - - D3 - - -', // B3: G
      'A2 - - - E3 - - - A2 - - - D3 - - -'  // B4: A to D
    ] },
    { instrument: 'pad', volume: 0.17, pattern: [
      hold('D3+F#3+A3'), hold('D3+F#3+A3'), hold('G3+B3+D4'), hold('A3+C#4+E4'),
      hold('D3+F#3+A3'), hold('B2+D3+F#3'), hold('G3+B3+D4'), hold('A3+C#4+E4')
    ] },
    { instrument: 'lead', volume: 0.29, pattern: [
      'D5 - - . A4 - - . F#4 - A4 - D5 - - .', // A1: D, opening call
      'F#5 - - . E5 - D5 - A4 - - . B4 - C#5 -', // A2: answering descent
      'D5 - - . A4 - - . F#4 - A4 - D5 - E5 -', // A3: call varied
      'F#5 - E5 - D5 - B4 - A4 - - - . . . .', // A4: cadence / pickup space
      'A4 - - . D5 - F#5 - A5 - - . F#5 - E5 -', // B1: lifted response
      'D5 - - . B4 - D5 - F#5 - - . E5 - D5 -', // B2: Bm color
      'G5 - - . F#5 - E5 - D5 - B4 - G4 - B4 -', // B3: descending turn
      'A4 - - . C#5 - E5 - D5 - - - - - - -' // B4: resolves to D
    ] }
  ]
};

// D Dorian planning bed: long breaths, a quiet bass ostinato, and a changing upper line.
const build = {
  id: 'build', bpm: 84, stepsPerBeat: 4, bars: 16, loop: true,
  channels: [
    { instrument: 'hat', volume: 0.11, pattern: [
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . x .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . x .'
    ] },
    { instrument: 'bass', volume: 0.35, pattern: [
      'D2 - - . D2 - - . A2 - - . D2 - - .', // A1: Dm
      'D2 - - . A2 - - . D2 - - . A2 - - .', // A2
      'F2 - - . C3 - - . F2 - - . C3 - - .', // A3: F
      'C2 - - . G2 - - . C2 - - . G2 - - .', // A4: C
      'D2 - - . D2 - - . A2 - - . D2 - - .', // A5
      'D2 - - . A2 - - . D2 - - . A2 - - .', // A6
      'G2 - - . D3 - - . G2 - - . D3 - - .', // A7: G/Dorian
      'A1 - - . E2 - - . A1 - - . E2 - - .', // A8: Am, quiet tension
      'D2 - - . A2 - - . D2 - - . A2 - - .', // B1
      'F2 - - . C3 - - . F2 - - . A2 - - .', // B2
      'G2 - - . D3 - - . G2 - - . D3 - - .', // B3
      'D2 - - . A2 - - . D2 - - . A2 - - .', // B4
      'Bb1 - - . F2 - - . Bb1 - - . F2 - - .', // B5: brief Bb shade
      'F2 - - . C3 - - . F2 - - . C3 - - .', // B6
      'A1 - - . E2 - - . A1 - - . E2 - - .', // B7
      'D2 - - . A2 - - . D2 - - . A2 - - .' // B8: reset
    ] },
    { instrument: 'pad', volume: 0.19, pattern: [
      hold('D3+F3+A3'), hold('D3+F3+A3'), hold('F3+A3+C4'), hold('C3+E3+G3'),
      hold('D3+F3+A3'), hold('D3+F3+A3'), hold('G3+B3+D4'), hold('A2+D3+E3'),
      hold('D3+F3+A3'), hold('F3+A3+C4'), hold('G3+B3+D4'), hold('D3+F3+A3'),
      hold('Bb2+D3+F3'), hold('F3+A3+C4'), hold('A2+D3+E3'), hold('D3+F3+A3')
    ] },
    { instrument: 'pulse', volume: 0.085, pattern: [
      'A4 . . . . . F4 . . . . . A4 . . .', // A1: restrained signal
      '. . D4 . . . . . A4 . . . . . . .', // A2
      'C5 . . . . . A4 . . . . . C5 . . .', // A3
      '. . G4 . . . . . E4 . . . . . . .', // A4
      'A4 . . . . . F4 . . . . . D5 . . .', // A5
      '. . D4 . . . . . A4 . . . . . . .', // A6
      'B4 . . . . . G4 . . . . . D5 . . .', // A7
      '. . E4 . . . . . C#4 . . . . . . .', // A8: leading tone
      'A4 . . . . . F4 . . . . . A4 . . .', // B1
      '. . C5 . . . . . A4 . . . . . . .', // B2
      'D5 . . . . . B4 . . . . . G4 . . .', // B3
      '. . A4 . . . . . F4 . . . . . . .', // B4
      'F4 . . . . . D4 . . . . . F4 . . .', // B5: Bb chord color
      '. . C5 . . . . . A4 . . . . . . .', // B6
      'E4 . . . . . C#4 . . . . . A4 . . .', // B7
      '. . D4 . . . . . A4 . . . . . . .' // B8
    ] }
  ]
};

// D minor action cue. Sixteen bars form an A statement and a more urgent B answer.
const battle = {
  id: 'battle', bpm: 140, stepsPerBeat: 4, bars: 16, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.56, pattern: [
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . . x .',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . x x x',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . . x .',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . x x x',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . . x .',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . x x x',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . . x .',
      'x . . . . . x . x . . . . . x .', 'x . . . . . x . x . . . . x x x'
    ] },
    { instrument: 'snare', volume: 0.32, pattern: [
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . x x',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x x x x',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . x x',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x . . .',
      '. . . . x . . . . . . . x . . .', '. . . . x . . . . . . . x x x x'
    ] },
    { instrument: 'hat', volume: 0.19, pattern: [
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . x . x .',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . X X X X',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . x . x .',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . X X X X',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . x . x .',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . X X X X',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . x . x .',
      'x . x . x . x . x . x . x . x .', 'x . x . x . x . x . x . X X X X'
    ] },
    { instrument: 'bass', volume: 0.47, pattern: [
      'D2 . D2 . . A2 . D3 D2 . . A2 . C3 . A2', // A1: Dm syncopation
      'D2 . . A2 . D3 . A2 D2 . F2 . A2 . C3 .', // A2
      'Bb1 . Bb1 . . F2 . Bb2 Bb1 . . F2 . A2 . F2', // A3: Bb
      'C2 . . G2 . C3 . G2 C2 . E2 . G2 . Bb2 .', // A4: Cm
      'D2 . D2 . . A2 . D3 D2 . . A2 . C3 . A2', // A5
      'F2 . . C3 . F3 . C3 F2 . A2 . C3 . Eb3 .', // A6: F
      'C2 . C2 . . G2 . C3 C2 . . G2 . Bb2 . G2', // A7
      'A1 . . E2 . A2 . C3 D2 . . A2 . C3 . A2', // A8: fill home
      'D2 . D2 . . A2 . D3 D2 . . A2 . C3 . A2', // B1
      'F2 . . C3 . F3 . A2 F2 . . C3 . Eb3 . C3', // B2
      'G1 . G1 . . D2 . G2 G1 . . D2 . F2 . D2', // B3: Gm drive
      'A1 . . E2 . A2 . C3 A1 . . E2 . G2 . E2', // B4
      'Bb1 . Bb1 . . F2 . Bb2 Bb1 . . F2 . A2 . F2', // B5
      'G1 . . D2 . G2 . Bb2 G1 . . D2 . F2 . D2', // B6
      'A1 . A1 . . E2 . A2 C#2 . . G2 . Bb2 . G2', // B7: rising tension
      'D2 . D2 . A2 . C3 . D3 . . A2 C3 D3 C#3 D3' // B8: chromatic pickup
    ] },
    { instrument: 'pad', volume: 0.105, pattern: [
      hold('D3+F3+A3'), hold('D3+F3+A3'), hold('Bb2+D3+F3'), hold('C3+Eb3+G3'),
      hold('D3+F3+A3'), hold('F3+A3+C4'), hold('C3+Eb3+G3'), hold('A2+C3+E3'),
      hold('D3+F3+A3'), hold('F3+A3+C4'), hold('G2+Bb2+D3'), hold('A2+C3+E3'),
      hold('Bb2+D3+F3'), hold('G2+Bb2+D3'), hold('A2+C3+E3'), hold('D3+F3+A3')
    ] },
    { instrument: 'lead', volume: 0.245, pattern: [
      'D5 . . A4 . D5 F5 . A4 . . C5 D5 . . .', // A1: hook
      'F5 . . D5 . A4 . . C5 . D5 . F5 . . .', // A2
      'Bb4 . . F4 . Bb4 D5 . F4 . . A4 Bb4 . . .', // A3
      'C5 . . G4 . C5 Eb5 . G4 . . Bb4 C5 . D5 Eb5', // A4: fourth-bar lift
      'D5 . . A4 . D5 F5 . A4 . . C5 D5 . F5 .', // A5
      'F5 . . C5 . A4 . . C5 . F5 . A5 . . .', // A6
      'G5 . . D5 . G5 F5 . D5 . . Bb4 C5 . . .', // A7
      'A4 . . E4 . A4 C5 . E4 . . G4 A4 . C#5 D5', // A8: turnaround
      'D5 . F5 . A5 . . F5 D5 . . C5 A4 . D5 .', // B1: expanded melody
      'F5 . . C5 . A4 C5 . F5 . . A5 G5 . F5 .', // B2
      'G5 . . D5 . Bb4 D5 . G5 . . F5 D5 . . .', // B3
      'A5 . . E5 . C5 E5 . A4 . . C5 E5 . G5 A5', // B4
      'Bb5 . . F5 . D5 F5 . Bb4 . . A4 F5 . D5 .', // B5
      'G5 . . D5 . Bb4 D5 . G4 . . Bb4 D5 . F5 .', // B6
      'A5 . G5 . F5 . . E5 C#5 . . E5 G5 . Bb5 .', // B7: chromatic rise
      'D5 . . A4 . C5 D5 . F5 . E5 . D5 - - .' // B8: refrain / turn
    ] },
    { instrument: 'pulse', volume: 0.12, pattern: [
      '. . A4 . . . . C5 . . A4 . . . . .', // A1: countermelody
      '. . . . F4 . A4 . . . . . D5 . . .', // A2
      '. . F4 . . . . A4 . . F4 . . . . .', // A3
      '. . . . G4 . Bb4 . . . . . Eb5 . . .', // A4
      '. . A4 . . . . C5 . . A4 . . . F5 .', // A5
      '. . . . A4 . C5 . . . . . F5 . . .', // A6
      '. . D5 . . . . F5 . . D5 . . . . .', // A7
      '. . . . E4 . G4 . . . . . C#5 . . .', // A8
      'A4 . . . C5 . . . D5 . . . F5 . . .', // B1
      'C5 . . . A4 . . . F5 . . . A5 . . .', // B2
      'D5 . . . Bb4 . . . G5 . . . F5 . . .', // B3
      'E5 . . . C5 . . . A4 . . . C5 . . .', // B4
      'F5 . . . D5 . . . Bb4 . . . D5 . . .', // B5
      'D5 . . . Bb4 . . . G4 . . . Bb4 . . .', // B6
      'E5 . . . C#5 . . . A4 . . . G4 . . .', // B7
      'F5 . . . E5 . . . D5 . . . A4 . . .' // B8
    ] }
  ]
};

// D Phrygian / chromatic boss suite: low pedal, semitone approaches and hard chord stabs.
const boss = {
  id: 'boss', bpm: 150, stepsPerBeat: 4, bars: 8, loop: true,
  channels: [
    { instrument: 'kick', volume: 0.58, pattern: [
      'x . . x . . x . x . . x . . x .', 'x . . x . . x . x . . x . . x .',
      'x . . x . . x . x . . x . . x .', 'x . . x . . x . x . . x . x x x',
      'x . . x . . x . x . . x . . x .', 'x . . x . . x . x . . x . . x .',
      'x . . x . . x . x . . x . . x .', 'x . . x . . x . x . . x . x x x'
    ] },
    { instrument: 'snare', volume: 0.34, pattern: [
      '. . . . x . . . . . . . x . x .', '. . . . x . . . . . . . x . x .',
      '. . . . x . . . . . . . x . x .', '. . . . x . . . . . . . x x x x',
      '. . . . x . . . . . . . x . x .', '. . . . x . . . . . . . x . x .',
      '. . . . x . . . . . . . x . x .', '. . . . x . . . . . . . x x x x'
    ] },
    { instrument: 'hat', volume: 0.22, pattern: [
      'x x x x x x x x x x x x x x x X', 'x x x x x x x x x x x x x x x X',
      'x x x x x x x x x x x x x x x X', 'x x x x x x x x x x x x X X X X',
      'x x x x x x x x x x x x x x x X', 'x x x x x x x x x x x x x x x X',
      'x x x x x x x x x x x x x x x X', 'x x x x x x x x x x x x X X X X'
    ] },
    { instrument: 'bass', volume: 0.49, pattern: [
      'D2 . D2 . Eb2 . D2 . D2 . C#2 . D2 . Eb2 .', // A1: D/Eb crawl
      'D2 . D2 . Ab1 . A1 . D2 . C#2 . D2 . C2 .', // A2: tritone / semitone
      'Eb2 . Eb2 . E2 . Eb2 . Bb1 . B1 . Eb2 . D2 .', // A3
      'D2 . D2 . Eb2 . D2 . A1 . C#2 . D2 . . .', // A4
      'D2 . D2 . Eb2 . D2 . F2 . E2 . Eb2 . D2 .', // B1
      'Bb1 . Bb1 . C2 . Bb1 . F2 . E2 . Eb2 . D2 .', // B2: falling threat
      'C2 . C2 . C#2 . C2 . G1 . Ab1 . C2 . Bb1 .', // B3
      'A1 . A1 . Bb1 . A1 . Eb2 . C#2 . D2 . D2 .' // B4: cadence to D pedal
    ] },
    { instrument: 'pad', volume: 0.145, pattern: [
      hold('D3+Ab3'), hold('D3+A3+Eb4'), hold('Eb3+A3'), hold('D3+Ab3'),
      hold('D3+F3+Ab3'), hold('Bb2+E3+F3'), hold('C3+F#3+G3'), hold('D3+Ab3')
    ] },
    { instrument: 'lead', volume: 0.255, pattern: [
      'D5 . D5 . . D5 . . Ab4 . . . A4 . . .', // A1: tritone answer
      'D5 . D5 . . F5 . . Eb5 . D5 . C#5 . D5 .', // A2
      'Eb5 . Eb5 . . Eb5 . . Bb4 . . . B4 . . .', // A3
      'D5 . D5 . . A4 . Ab4 A4 . C#5 . D5 . . .', // A4
      'D5 . F5 . . Ab5 . . A5 . Ab5 . F5 . Eb5 .', // B1
      'Bb4 . D5 . . F5 . . E5 . Eb5 . D5 . C#5 .', // B2
      'C5 . Eb5 . . G5 . . F#5 . F5 . Eb5 . D5 .', // B3
      'A4 . C5 . Eb5 . D5 . C#5 . . . D5 - - .' // B4
    ] }
  ]
};

// D major, three seconds at 160 bpm: compact fanfare with a clear tonic resolution.
const victory = {
  id: 'victory', bpm: 160, stepsPerBeat: 4, bars: 2, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.31, pattern: [
      'D5 . F#5 . A5 . . A5 D6 - - . A5 - - .', // D fanfare
      'F#5 . A5 . D6 . . E6 D6 - - - D6 - - -' // resolves to D
    ] },
    { instrument: 'bass', volume: 0.4, pattern: [
      'D3 - - - - - - - A2 - - - D3 - - -',
      'D3 - - - - - - - A2 - - - D3 - - -'
    ] },
    { instrument: 'pad', volume: 0.17, pattern: [hold('D3+F#3+A3'), hold('D3+F#3+A3')] },
    { instrument: 'kick', volume: 0.48, pattern: [
      'x . . . x . . . x . . . x . . .', 'x . . . . . . . x . . . x . . .'
    ] },
    { instrument: 'snare', volume: 0.27, pattern: [
      '. . . . x . . . . . . . x . x x', 'x . . . . . . . . . . . . . . .'
    ] }
  ]
};

// D minor descent, three seconds at 80 bpm; resolves into a quiet D-minor chord.
const defeat = {
  id: 'defeat', bpm: 80, stepsPerBeat: 4, bars: 1, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.28, pattern: [
      'A4 - - - G4 - - - F4 - - - E4 - - -'
    ] },
    { instrument: 'bass', volume: 0.38, pattern: ['A2 - - - - - - - D2 - - - - - - -'] },
    { instrument: 'pad', volume: 0.18, pattern: [hold('D3+F3+A3')] },
    { instrument: 'kick', volume: 0.38, pattern: ['x . . . . . . . . . . . . . . .'] }
  ]
};

// One bar at 160 bpm (1.5 s): snare roll followed by a D-minor horn call.
const waveStart = {
  id: 'waveStart', bpm: 160, stepsPerBeat: 4, bars: 1, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.28, pattern: ['D4 . D4 . A4 - - - D5 - - - - - - -'] },
    { instrument: 'snare', volume: 0.26, pattern: ['x . x . x x x x X X X X . . . .'] },
    { instrument: 'kick', volume: 0.45, pattern: ['x . . . . . . . x . . . . . . .'] }
  ]
};

// One bar at 150 bpm: dissonant D/Ab alarm stabs over a clipped drum warning.
const bossAlert = {
  id: 'bossAlert', bpm: 150, stepsPerBeat: 4, bars: 1, loop: false,
  channels: [
    { instrument: 'lead', volume: 0.3, pattern: ['D5 - - . Ab5 - - . D5 - - . Ab5 - - .'] },
    { instrument: 'bass', volume: 0.43, pattern: ['D2 - - - - - - - D2 - - - - - - -'] },
    { instrument: 'pad', volume: 0.14, pattern: [hold('D3+Ab3')] },
    { instrument: 'snare', volume: 0.26, pattern: ['. . . . . . . . x . x . X . X .'] },
    { instrument: 'kick', volume: 0.5, pattern: ['x . . . . . . . x . . . . . . .'] }
  ]
};

/** @type {Record<string, Track>} */
export const TRACKS = Object.fromEntries([menu, build, battle, boss, victory, defeat, waveStart, bossAlert].map((t) => [t.id, t]));
