import { enemies } from './enemies.js';
import { levels } from './levels.js';
import { bosses, BOSS_SEQUENCE } from './bosses.js';

/**
 * @typedef {{id:string,count:number,interval:number}} SpawnGroup
 * @typedef {{enemies:SpawnGroup[],supply?:boolean,coins?:number}} WaveDef
 */

/** Seconds between consecutive groups inside one wave. */
export const GROUP_GAP = 1.5;

/** Level at which each enemy joins the roster (design section 5). */
export const INTRODUCED_AT = {
  grunt: 1, runner: 1,
  scout: 2, trooper: 2,
  bruiser: 3,
  skirmisher: 5,
  breaker: 7,
  heavy: 8,
  drone: 11,
  jet: 13,
  bomber: 15,
  vanguard: 17,
  gunship: 19,
  tank: 21,
  crawler: 23,
  bulldozer: 25,
  raider: 26,
  marauder: 28,
  sky_tank: 31,
  stealth_copter: 32,
};

const hpOf = new Map([...enemies, ...bosses].map((d) => [d.id, d.hp]));
const speedOf = new Map([...enemies, ...bosses].map((d) => [d.id, d.speed]));

/** Per-spawn stat scaling (design section 6; level-1 so L1 is unscaled). */
export function levelScaling(level) {
  return { hp: 1 + 0.06 * (level - 1), speed: 1 + 0.01 * Math.floor(level / 10) };
}

/** Enemy ids available at `level`, ordered by introduction. */
export function rosterForLevel(level) {
  return enemies
    .filter((e) => INTRODUCED_AT[e.id] <= level)
    .sort((a, b) => INTRODUCED_AT[a.id] - INTRODUCED_AT[b.id])
    .map((e) => e.id);
}

/**
 * Wave budget in base-HP units: (400 + 30 * level) * (1 + 0.3 * waveIndex).
 * Actual HP is further multiplied by levelScaling(level).hp at spawn.
 */
export function waveBudget(level, waveIndex) {
  return (400 + 30 * level) * (1 + 0.3 * waveIndex);
}

const round2 = (n) => Math.round(n * 100) / 100;

function composeWave(level, i, n, roster, isBossWave) {
  const newIds = roster.filter((id) => INTRODUCED_AT[id] === level);
  const budget = waveBudget(level, i) * (isBossWave ? 0.6 : 1);
  const groupCount = Math.min(roster.length, 1 + (i >= 1 ? 1 : 0) + (i >= Math.ceil(n / 2) && level >= 5 ? 1 : 0));
  const ids = [];
  if (i >= 1 || roster.length === 1) ids.push(...newIds.slice(0, groupCount));
  // Deterministic rotation through the roster fills remaining slots.
  for (let j = 0; ids.length < groupCount && j < roster.length * 3; j++) {
    const id = roster[(level + 2 * i + 3 * j) % roster.length];
    if (!ids.includes(id)) ids.push(id);
  }
  const weights = ids.map((id) => (newIds.includes(id) ? 1.5 : 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  return ids.map((id, k) => {
    const count = Math.max(1, Math.min(45, Math.round((budget * weights[k]) / wsum / hpOf.get(id))));
    const interval = round2(Math.max(0.4, Math.min(1.6, 1.2 / speedOf.get(id)) * Math.max(0.5, 1 - count / 60)));
    return { id, count, interval };
  });
}

/** @returns {WaveDef[]} deterministic; combat waves plus an optional supply drop wave. */
export function buildWaves(level) {
  const lv = levels[level - 1];
  if (!lv) throw new Error(`no waves for level ${level}`);
  if (level === 1) {
    return [
      { enemies: [{ id: 'grunt', count: 6, interval: 1.4 }] },
      {
        enemies: [
          { id: 'grunt', count: 6, interval: 1.2 },
          { id: 'runner', count: 3, interval: 1.0 },
        ],
      },
      {
        enemies: [
          { id: 'grunt', count: 8, interval: 1.0 },
          { id: 'runner', count: 5, interval: 0.8 },
        ],
      },
    ];
  }
  const n = lv.combatWaves;
  const roster = rosterForLevel(level);
  const bossIds = lv.boss ? BOSS_SEQUENCE[lv.boss] ?? [] : [];
  const waves = [];
  for (let i = 0; i < n; i++) {
    const isBossWave = i === n - 1 && bossIds.length > 0;
    const groups = composeWave(level, i, n, roster, isBossWave);
    if (isBossWave) for (const id of bossIds) groups.push({ id, count: 1, interval: 1.0 });
    waves.push({ enemies: groups });
  }
  if (lv.supplyDropAfterWave) {
    waves.splice(lv.supplyDropAfterWave, 0, { enemies: [], supply: true, coins: 150 + 10 * level });
  }
  return waves;
}
