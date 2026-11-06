import { beginWave } from './spawner.js';
import { createTower, getTowerDef, TARGET_MODES } from './towers.js';
import { recomputeAuras } from './auras.js';
import { registerTower, creditSpend, trackUpgrade, trackSell } from './stats.js';
import { upgradeCost } from '../systems/economy.js';

/** @typedef {{ok:true}|{ok:false,reason:string}} Result */

/**
 * Start the next wave (or call it early during the countdown).
 * Early calls pay a small bonus: 1 coin per 2 full seconds left on the countdown.
 * @returns {Result}
 */
export function startWave(world) {
  if (world.phase !== 'build') return { ok: false, reason: 'wrong_phase' };
  if (world.waveIndex >= world.waves.length) return { ok: false, reason: 'no_more_waves' };
  let bonus = 0;
  if (world.countdown !== null) {
    bonus = Math.floor(world.countdown / 2);
    world.coins += bonus;
  }
  beginWave(world);
  return { ok: true, bonus };
}

/**
 * Check whether a tower can be placed (no side effects).
 * Reasons: unknown_tower, locked, not_buildable, occupied, unaffordable, game_over.
 * @returns {Result}
 */
export function canPlaceTower(world, typeId, tx, ty) {
  if (world.phase === 'won' || world.phase === 'lost') return { ok: false, reason: 'game_over' };
  const def = getTowerDef(typeId);
  if (!def) return { ok: false, reason: 'unknown_tower' };
  if (!world.unlocked.includes(typeId)) return { ok: false, reason: 'locked' };
  if (!world.map.buildable(tx, ty)) return { ok: false, reason: 'not_buildable' };
  if (world.towers.some((t) => t.tx === tx && t.ty === ty)) return { ok: false, reason: 'occupied' };
  if (world.coins < def.levels[0].cost) return { ok: false, reason: 'unaffordable' };
  return { ok: true };
}

/** @returns {{ok:true,tower:object}|{ok:false,reason:string}} */
export function placeTower(world, typeId, tx, ty) {
  const check = canPlaceTower(world, typeId, tx, ty);
  if (!check.ok) return check;
  const def = getTowerDef(typeId);
  world.coins -= def.levels[0].cost;
  const tower = createTower(world, def, tx, ty);
  world.towers.push(tower);
  registerTower(world, tower);
  recomputeAuras(world);
  world.events.push({ type: 'place', towerId: tower.id });
  return { ok: true, tower };
}

export const MAX_LEVEL = 5;
export const SELL_RATE_BUILD = 0.7;
export const SELL_RATE_WAVE = 0.5;

const findTower = (world, id) => world.towers.find((t) => t.id === id);

/** Price of the next level now (+15% during a wave), or null at max level. */
export function upgradeCostOf(world, tower) {
  if (tower.level >= MAX_LEVEL) return null;
  return upgradeCost(tower.def.levels[tower.level].cost, world.phase === 'wave');
}

/** Coins a sale would return right now. */
export function sellValue(world, tower) {
  return Math.floor(tower.spent * (world.phase === 'wave' ? SELL_RATE_WAVE : SELL_RATE_BUILD));
}

/**
 * Reasons: game_over, not_found, max_level, unaffordable.
 * @returns {Result}
 */
export function upgradeTower(world, towerId) {
  if (world.phase === 'won' || world.phase === 'lost') return { ok: false, reason: 'game_over' };
  const tower = findTower(world, towerId);
  if (!tower) return { ok: false, reason: 'not_found' };
  const cost = upgradeCostOf(world, tower);
  if (cost === null) return { ok: false, reason: 'max_level' };
  if (world.coins < cost) return { ok: false, reason: 'unaffordable' };
  world.coins -= cost;
  tower.spent += cost;
  creditSpend(world, tower.id, cost);
  tower.level++;
  trackUpgrade(world, tower.level);
  recomputeAuras(world);
  world.events.push({ type: 'upgrade', towerId, level: tower.level, cost });
  return { ok: true, cost, level: tower.level };
}

/** Reasons: game_over, not_found. @returns {Result} */
export function sellTower(world, towerId) {
  if (world.phase === 'won' || world.phase === 'lost') return { ok: false, reason: 'game_over' };
  const tower = findTower(world, towerId);
  if (!tower) return { ok: false, reason: 'not_found' };
  const refund = sellValue(world, tower);
  world.coins += refund;
  world.towers = world.towers.filter((t) => t !== tower);
  trackSell(world);
  recomputeAuras(world);
  world.events.push({ type: 'sell', towerId, refund });
  return { ok: true, refund };
}

/** Reasons: not_found, bad_mode. @returns {Result} */
export function setTargeting(world, towerId, mode) {
  const tower = findTower(world, towerId);
  if (!tower) return { ok: false, reason: 'not_found' };
  if (!TARGET_MODES.includes(mode) || (mode === 'air' && tower.def.family !== 'anti-air')) return { ok: false, reason: 'bad_mode' };
  tower.targeting = mode;
  return { ok: true };
}
