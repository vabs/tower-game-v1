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
const typeOf = new Map([...enemies, ...bosses].map((d) => [d.id, d.type]));
const speedOf = new Map([...enemies, ...bosses].map((d) => [d.id, d.speed]));

/** Per-spawn stat scaling (design section 6; level-1 so L1 is unscaled). */
export function levelScaling(level) {
  return { hp: (1 + 0.03 * (level - 1)) * (LEVEL_TUNE[level - 1] ?? 1), speed: 1 + 0.01 * Math.floor(level / 10), boss: BOSS_TUNE[level - 1] ?? 1 };
}

/** Enemy ids available at `level`, ordered by introduction. */
export function rosterForLevel(level) {
  return enemies
    .filter((e) => INTRODUCED_AT[e.id] <= level)
    .sort((a, b) => INTRODUCED_AT[a.id] - INTRODUCED_AT[b.id])
    .map((e) => e.id);
}

/**
 * Per-level multiplier on enemy HP (on top of the 1 + 0.03 * (level - 1) curve), produced by
 * auto-tuning (tools/autotune.mjs) so the balance bot ends most levels with roughly half its HP.
 * Bosses scale with it too.
 */
export const LEVEL_TUNE = [1, 2.17, 1.99, 2.22, 2.06, 2.14, 2.4, 2.4, 1.76, 1.06, 1.17, 1.7, 0.86, 1.09, 0.75, 1.02, 1.55, 1.17, 1.38, 0.35, 1.7, 1.29, 1.06, 0.94, 1.5, 1.7, 0.73, 1.7, 0.79, 1.1, 1.41, 0.39, 0.66, 0.71, 0.64, 1.09, 0.74, 0.68, 0.91, 0.48, 0.67, 0.8, 0.61, 0.7, 0.56, 0.8, 0.64, 0.54, 0.59, 0.51];

/** Extra HP multiplier for bosses only (auto-tuned like LEVEL_TUNE; 1 on non-boss levels). */
export const BOSS_TUNE = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.94, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.45, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.29, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.61, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.69];

/**
 * Wave budget in base-HP units: (320 + 14 * level) * (1 + 0.25 * waveIndex).
 * Actual HP is further multiplied by levelScaling(level).hp at spawn.
 */
export function waveBudget(level, waveIndex) {
  return (320 + 14 * level) * (1 + 0.25 * waveIndex);
}

const round2 = (n) => Math.round(n * 100) / 100;

const isAirId = (id) => typeOf.get(id) === 'air';

/** Share of a mixed wave's HP budget spent on air units; every third wave is an "air raid". */
const AIR_SHARE = 0.3;
const AIR_RAID_SHARE = 0.5;

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
  // Never a pure air wave once ground enemies exist: a defence cannot be all anti-air from the start.
  const ground = roster.filter((id) => !isAirId(id));
  if (ground.length && ids.every(isAirId)) ids.unshift(ground[(level + i) % ground.length]);
  const airIds = ids.filter(isAirId);
  const groundIds = ids.filter((id) => !isAirId(id));
  const airShare = airIds.length && groundIds.length ? (i % 3 === 2 ? AIR_RAID_SHARE : AIR_SHARE) : airIds.length ? 1 : 0;
  const rel = (id) => (newIds.includes(id) ? 1.5 : 1);
  const sum = (list) => list.reduce((a, id) => a + rel(id), 0);
  const weights = ids.map((id) => {
    const air = isAirId(id);
    const share = air ? airShare : 1 - airShare;
    return (rel(id) / sum(air ? airIds : groundIds)) * share;
  });
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
          { id: 'grunt', count: 7, interval: 1.1 },
          { id: 'runner', count: 4, interval: 0.9 },
        ],
      },
      {
        enemies: [
          { id: 'grunt', count: 8, interval: 1.1 },
          { id: 'runner', count: 4, interval: 0.9 },
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
