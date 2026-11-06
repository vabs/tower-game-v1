import { beginWave } from './spawner.js';
import { createTower, getTowerDef } from './towers.js';

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
  world.events.push({ type: 'place', towerId: tower.id });
  return { ok: true, tower };
}
