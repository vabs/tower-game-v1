import { createRng } from '../core/rng.js';
import { levels, getUnlocksForLevel } from '../data/levels.js';
import { maps, mapIdForLevel } from '../data/maps.js';
import { loadMap } from './map.js';
import { buildWaves } from '../data/waves.js';
import { updateEnemies } from './enemies.js';
import { updateSpawner } from './spawner.js';
import { updateTowers } from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { updateEffects } from './effects.js';

export const STEP = 1 / 60;
export const STARTING_HP = 25;
export const WAVE_COUNTDOWN = 10;

/** Decision 15. */
export function startingCoins(level) {
  return 200 + 25 * (level - 1);
}

/**
 * @typedef {'build'|'wave'|'won'|'lost'} Phase
 * @typedef {object} World
 * @property {Phase} phase
 * @property {number} level
 * @property {number} waveIndex   index of the wave to start next / currently running
 * @property {number} coins
 * @property {number} hp
 * @property {object[]} enemies
 * @property {object[]} towers
 * @property {object[]} projectiles
 * @property {object[]} events    consumer clears each frame
 * @property {number} time
 * @property {{next:()=>number,int:(n:number)=>number,chance:(p:number)=>boolean}} rng
 * @property {import('./map.js').GameMap} map
 */

/** Pure and deterministic given `seed`. */
export function createWorld(levelId, { seed = 1, unlocked, coins, hp } = {}) {
  const level = levels[levelId - 1];
  if (!level) throw new Error(`unknown level ${levelId}`);
  const cumulative = [];
  for (let i = 1; i <= levelId; i++) cumulative.push(...getUnlocksForLevel(i));
  return {
    phase: 'build',
    level: levelId,
    seed,
    waveIndex: 0,
    waves: buildWaves(levelId),
    countdown: null,
    countdownLength: WAVE_COUNTDOWN,
    spawner: null,
    coins: coins ?? startingCoins(levelId),
    hp: hp ?? STARTING_HP,
    maxHp: hp ?? STARTING_HP,
    enemies: [],
    towers: [],
    projectiles: [],
    fields: [],
    events: [],
    time: 0,
    rng: createRng(seed),
    map: loadMap(maps[mapIdForLevel(levelId)]),
    unlocked: unlocked ?? cumulative,
    nextId: 1,
  };
}

/** Advance the simulation by a fixed dt. */
export function step(world, dt = STEP) {
  if (world.phase === 'won' || world.phase === 'lost') return;
  world.time += dt;
  updateSpawner(world, dt);
  updateEffects(world, dt);
  updateEnemies(world, dt);
  updateTowers(world, dt);
  updateProjectiles(world, dt);
  world.enemies = world.enemies.filter((e) => !e.dead);
  if (world.hp <= 0) {
    world.phase = 'lost';
    world.events.push({ type: 'levelEnd', result: 'lost' });
  }
}
