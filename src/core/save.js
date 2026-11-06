import { levels } from '../data/levels.js';
import { isBetterMedal, MEDAL_RANK } from './medals.js';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, isDifficulty } from './difficulty.js';

export const SAVE_KEY = 'td-save-v1';
export const MAX_LEVEL = levels.length;

/**
 * @typedef {object} Save
 * @property {1} version
 * @property {number} unlockedLevel      highest level the player may start
 * @property {Record<string,'gold'|'silver'|'bronze'>} medals   best medal per cleared level id
 * @property {string} [difficulty]          'recruit'|'regular'|'veteran' (missing in old saves: regular)
 * @property {Record<string,string>} [medalDifficulty]  difficulty each best medal was earned on
 * @property {{playTime:number, towers:Record<string,{damage:number,kills:number,spent:number}>}} stats
 */

export function freshSave() {
  return { version: 1, unlockedLevel: 1, difficulty: DEFAULT_DIFFICULTY, medalDifficulty: {}, medals: {}, stats: { playTime: 0, towers: {} } };
}

/** localStorage, or null when unavailable (private mode, blocked, no DOM). */
export function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const num = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? v : d);

/** Validate untrusted parsed JSON into a Save; anything unusable falls back to fresh. */
export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return freshSave();
  const out = freshSave();
  const medals = raw.medals && typeof raw.medals === 'object' ? raw.medals : {};
  for (const [k, m] of Object.entries(medals)) {
    const id = Number(k);
    if (Number.isInteger(id) && id >= 1 && id <= MAX_LEVEL && MEDAL_RANK[m]) out.medals[id] = m;
  }
  out.difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : DEFAULT_DIFFICULTY;
  const md = raw.medalDifficulty && typeof raw.medalDifficulty === 'object' ? raw.medalDifficulty : {};
  for (const [k, d] of Object.entries(md)) if (out.medals[k] && isDifficulty(d)) out.medalDifficulty[k] = d;
  const clearedMax = Math.max(0, ...Object.keys(out.medals).map(Number));
  const unlocked = Number.isInteger(raw.unlockedLevel) ? raw.unlockedLevel : 1;
  out.unlockedLevel = Math.min(MAX_LEVEL, Math.max(1, unlocked, Math.min(MAX_LEVEL, clearedMax + 1)));
  const st = raw.stats;
  if (st && typeof st === 'object') {
    out.stats.playTime = num(st.playTime);
    for (const [typeId, t] of Object.entries(st.towers && typeof st.towers === 'object' ? st.towers : {})) {
      if (t && typeof t === 'object') out.stats.towers[typeId] = { damage: num(t.damage), kills: num(t.kills), spent: num(t.spent) };
    }
  }
  return out;
}

/** Missing, unreadable or corrupt storage yields a fresh save; never throws. */
export function loadSave(storage = defaultStorage()) {
  try {
    const text = storage?.getItem(SAVE_KEY);
    if (!text) return freshSave();
    return normalizeSave(JSON.parse(text));
  } catch {
    return freshSave();
  }
}

/** @returns {boolean} whether the write succeeded */
export function writeSave(save, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage = defaultStorage()) {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
  return freshSave();
}

export const isLevelUnlocked = (save, levelId) => levelId >= 1 && levelId <= save.unlockedLevel;
export const hasProgress = (save) => save.unlockedLevel > 1 || Object.keys(save.medals).length > 0;

/**
 * Record a cleared level: keep the better medal, unlock the next level, fold in run stats.
 * Mutates and returns `save`.
 * run: { difficulty?:string, time?:number, towers?:{typeId:string,damage:number,kills:number,spent:number}[] }
 */
export function recordClear(save, levelId, medal, run = {}) {
  const diff = isDifficulty(run.difficulty) ? run.difficulty : DEFAULT_DIFFICULTY;
  const prevDiff = save.medalDifficulty?.[levelId] ?? DEFAULT_DIFFICULTY;
  const harderSame = medal === save.medals[levelId] && DIFFICULTIES[diff].rank > DIFFICULTIES[prevDiff].rank;
  if (isBetterMedal(medal, save.medals[levelId]) || harderSame) {
    save.medals[levelId] = medal;
    (save.medalDifficulty ??= {})[levelId] = diff;
  }
  save.unlockedLevel = Math.max(save.unlockedLevel, Math.min(MAX_LEVEL, levelId + 1));
  save.stats.playTime += num(run.time);
  for (const t of run.towers ?? []) {
    const agg = (save.stats.towers[t.typeId] ??= { damage: 0, kills: 0, spent: 0 });
    agg.damage += num(t.damage);
    agg.kills += num(t.kills);
    agg.spent += num(t.spent);
  }
  return save;
}

/** Totals for the Game End screen. */
export function summarizeCampaign(save) {
  const count = { gold: 0, silver: 0, bronze: 0 };
  for (const m of Object.values(save.medals)) count[m]++;
  const bestTowers = Object.entries(save.stats.towers)
    .map(([typeId, t]) => ({ typeId, ...t }))
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 3);
  return { ...count, cleared: count.gold + count.silver + count.bronze, playTime: save.stats.playTime, bestTowers };
}
