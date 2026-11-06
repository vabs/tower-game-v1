/**
 * Difficulty presets. Pure data: the sim reads them through `createWorld({ difficulty })`.
 * Regular is the balance baseline (bot, autotune and balance tests always use it).
 */
export const DIFFICULTIES = {
  recruit: { id: 'recruit', name: 'Recruit', tag: 'R', rank: 0, hpMult: 0.75, coinMult: 1.25, blurb: 'Enemy HP -25%, +25% starting coins' },
  regular: { id: 'regular', name: 'Regular', tag: '', rank: 1, hpMult: 1, coinMult: 1, blurb: 'The intended balance' },
  veteran: { id: 'veteran', name: 'Veteran', tag: 'V', rank: 2, hpMult: 1.4, coinMult: 1, blurb: 'Enemy HP +40%' },
};
export const DIFFICULTY_IDS = ['recruit', 'regular', 'veteran'];
export const DEFAULT_DIFFICULTY = 'regular';

export const getDifficulty = (id) => DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
export const isDifficulty = (id) => Object.hasOwn(DIFFICULTIES, id);
