/** Pure note and pattern parsing for the music data (no Web Audio, safe in node). */

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Instrument name -> how its pattern tokens are read: 'note' (C4, F#3, chords A3+C4) or 'drum' (x, X). */
export const INSTRUMENT_KINDS = {
  lead: 'note', pulse: 'note', bass: 'note', pad: 'note',
  kick: 'drum', snare: 'drum', hat: 'drum',
};

/** 'C4' -> 60, 'A4' -> 69, 'F#3', 'Bb2'. Returns null for anything that is not a note name. */
export function parseNote(str) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(str);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return midi >= 0 && midi <= 127 ? midi : null;
}

export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** A pattern is a whitespace separated string, or an array of such strings (one per bar); one token per step. */
export function tokenize(pattern) {
  const text = Array.isArray(pattern) ? pattern.join(' ') : pattern;
  if (typeof text !== 'string') throw new Error('pattern must be a string or an array of strings');
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Parse a pattern into step events. '.' rest, '-' hold the previous note, note token / chord (A3+C4+E4) for
 * note instruments, 'x' (hit) or 'X' (accent) for drums.
 * @returns {{steps:number, events:{step:number, len:number, midis:number[], accent:boolean}[]}}
 * @throws on an unknown token or a hold with nothing to hold
 */
export function parsePattern(pattern, kind = 'note') {
  const tokens = tokenize(pattern);
  const events = [];
  let last = null;
  tokens.forEach((tok, step) => {
    if (tok === '.') { last = null; return; }
    if (tok === '-') {
      if (!last) throw new Error(`hold '-' at step ${step} has nothing to hold`);
      last.len++;
      return;
    }
    if (kind === 'drum') {
      if (tok !== 'x' && tok !== 'X') throw new Error(`bad drum token '${tok}' at step ${step}`);
      last = null;
      events.push({ step, len: 1, midis: [], accent: tok === 'X' });
      return;
    }
    const midis = tok.split('+').map(parseNote);
    if (midis.some((n) => n === null)) throw new Error(`bad note '${tok}' at step ${step}`);
    last = { step, len: 1, midis, accent: false };
    events.push(last);
  });
  return { steps: tokens.length, events };
}
