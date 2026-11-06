import { buildWaves } from '../data/waves.js';
import { enemies } from '../data/enemies.js';

/**
 * Optional per-level contracts (cosmetic replay goal). Each level gets one, chosen deterministically from a
 * small pool. `evaluateContract` is pure: it only reads the tracker `world.stats.contract` (see stats.js).
 */
export const CONTRACT_KINDS = ['maxTowers', 'maxFamilies', 'maxUpgradeLevel', 'noSelling', 'noAntiAir'];
export const CONTRACT_MAX_FAMILIES = 2;
export const CONTRACT_MAX_UPGRADE = 3;

const airIds = new Set(enemies.filter((e) => e.type === 'air').map((e) => e.id));

/** True when no wave of the level contains an air unit (so "win without Anti-Air" is possible). */
export function levelHasAir(level) {
  return buildWaves(level).some((w) => w.enemies.some((g) => airIds.has(g.id)));
}

/** Tower budget of the "<= N towers" contract: 6 early, growing with the level (max 15). */
export function towerLimitFor(level) {
  return Math.min(15, 6 + Math.floor(level / 5));
}

/** Kinds that make sense on this level. */
export function contractPool(level) {
  return CONTRACT_KINDS.filter((k) => k !== 'noAntiAir' || !levelHasAir(level));
}

/** @returns {{kind:string, n?:number, label:string, short:string}} deterministic for a level. */
export function contractFor(level) {
  const pool = contractPool(level);
  const kind = pool[(level * 7 + Math.floor(level / 5)) % pool.length];
  switch (kind) {
    case 'maxTowers': {
      const n = towerLimitFor(level);
      return { kind, n, label: `Use at most ${n} towers`, short: `${n} towers max` };
    }
    case 'maxFamilies':
      return { kind, n: CONTRACT_MAX_FAMILIES, label: `Use at most ${CONTRACT_MAX_FAMILIES} tower families`, short: `${CONTRACT_MAX_FAMILIES} families max` };
    case 'maxUpgradeLevel':
      return { kind, n: CONTRACT_MAX_UPGRADE, label: `No upgrades beyond L${CONTRACT_MAX_UPGRADE}`, short: `Upgrades to L${CONTRACT_MAX_UPGRADE} max` };
    case 'noSelling':
      return { kind, label: 'Never sell a tower', short: 'No selling' };
    default:
      return { kind, label: 'Win without Anti-Air', short: 'No Anti-Air' };
  }
}

/**
 * Did the run satisfy the contract? `t` is `world.stats.contract`:
 * { placed (towers ever built, sold ones included), families[], maxLevel, sold, usedAntiAir }.
 */
export function evaluateContract(contract, t) {
  if (!contract || !t) return false;
  switch (contract.kind) {
    case 'maxTowers': return t.placed <= contract.n;
    case 'maxFamilies': return t.families.length <= contract.n;
    case 'maxUpgradeLevel': return t.maxLevel <= contract.n;
    case 'noSelling': return t.sold === 0;
    case 'noAntiAir': return !t.usedAntiAir;
    default: return false;
  }
}

/** Contract result of a finished world: true only for a won level that met the contract. */
export function contractResult(world) {
  return world.phase === 'won' && evaluateContract(contractFor(world.level), world.stats.contract);
}
