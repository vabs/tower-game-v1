import { INSTRUMENT_KINDS, parsePattern } from './notes.js';

export const BEATS_PER_BAR = 4;

/** Number of steps in one pass of a track. */
export const totalSteps = (t) => t.bars * (t.beatsPerBar ?? BEATS_PER_BAR) * t.stepsPerBeat;

/** @returns {string[]} human readable problems; empty when the track is valid */
export function validateTrack(t) {
  const errs = [];
  const bad = (m) => errs.push(`${t?.id ?? '?'}: ${m}`);
  if (!t || typeof t !== 'object') return ['track is not an object'];
  if (typeof t.id !== 'string' || !t.id) bad('missing id');
  if (!(t.bpm >= 30 && t.bpm <= 300)) bad(`bpm ${t.bpm} outside 30..300`);
  if (!Number.isInteger(t.stepsPerBeat) || t.stepsPerBeat < 1 || t.stepsPerBeat > 8) bad('stepsPerBeat must be an integer 1..8');
  if (!Number.isInteger(t.bars) || t.bars < 1) bad('bars must be a positive integer');
  if (typeof t.loop !== 'boolean') bad('loop must be a boolean');
  if (!Array.isArray(t.channels) || !t.channels.length) { bad('needs at least one channel'); return errs; }
  if (errs.length) return errs;
  const want = totalSteps(t);
  t.channels.forEach((ch, i) => {
    const at = `channel ${i} (${ch?.instrument})`;
    const kind = INSTRUMENT_KINDS[ch?.instrument];
    if (!kind) return bad(`${at}: unknown instrument`);
    if (!(ch.volume > 0 && ch.volume <= 1)) bad(`${at}: volume must be in (0, 1]`);
    try {
      const { steps } = parsePattern(ch.pattern, kind);
      if (steps !== want) bad(`${at}: ${steps} steps, expected ${want} (bars x beats x stepsPerBeat)`);
    } catch (e) {
      bad(`${at}: ${e.message}`);
    }
  });
  return errs;
}
