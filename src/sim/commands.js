import { beginWave } from './spawner.js';

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
