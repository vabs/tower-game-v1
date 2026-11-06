import { TILE_SIZE } from '../core/grid.js';
import { selectTarget } from '../systems/targeting.js';
import { towers as towerDefs } from '../data/towers.js';
import { canHitAir, CRIT_MULT } from './damage.js';
import { spawnProjectile, resolveHit, effectsOf } from './projectiles.js';
import { addGasField, chainLightning } from './effects.js';

export { canHitAir };

const defById = new Map(towerDefs.map((d) => [d.id, d]));

export const TARGET_MODES = ['first', 'last', 'closest', 'strongest'];
/** Gatling fire rate ramps from this fraction of full to 100% over `spoolUp` seconds. */
export const SPOOL_START = 0.25;
/** Width (tiles, each side) of a piercing rail shot's line. */
const PIERCE_HALF_WIDTH = 0.4;

export function getTowerDef(id) {
  return defById.get(id);
}

export function towerLevel(tower) {
  return tower.def.levels[tower.level - 1];
}

/** Effective stats: level row + auras + gatling spool. Missing/zero fields are safe (Logistics Hub). */
export function towerStats(tower) {
  const lv = towerLevel(tower);
  const aura = tower.aura ?? { fireRate: 0, range: 0 };
  const spoolUp = tower.def.special?.spoolUp;
  const spool = spoolUp ? SPOOL_START + (1 - SPOOL_START) * Math.min(1, (tower.spool ?? 0) / spoolUp) : 1;
  const damage = lv.damage ?? 0;
  const baseRate = lv.rate ?? 0;
  const rate = baseRate * (1 + aura.fireRate) * spool;
  const range = (lv.range ?? 0) * (1 + aura.range);
  return { damage, rate, range, rangePx: range * TILE_SIZE, dps: damage * rate, baseRate };
}

export function createTower(world, def, tx, ty) {
  return {
    id: world.nextId++,
    typeId: def.id,
    def,
    level: 1,
    tx,
    ty,
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
    cooldown: 0,
    targeting: 'first',
    spent: def.levels[0].cost,
    kills: 0,
    spool: 0,
    aura: { fireRate: 0, range: 0 },
  };
}

/** Interceptor Drone orbits its tower; shots leave from the drone. */
export const DRONE_ORBIT_PX = 18;
export function dronePosition(world, tower) {
  const a = world.time * 2.2 + tower.id;
  return { x: tower.x + Math.cos(a) * DRONE_ORBIT_PX, y: tower.y + Math.sin(a) * DRONE_ORBIT_PX * 0.7 - 10 };
}

/** Rail shot: instant line through the target; hits up to `pierce` enemies along it. */
function fireLine(world, tower, target, shot, lv, rangePx) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hits = [];
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    if (e.air && !shot.mods.canHitAir) continue;
    const rx = e.x - tower.x;
    const ry = e.y - tower.y;
    const along = rx * ux + ry * uy;
    if (along < 0 || along > rangePx) continue;
    if (Math.abs(rx * uy - ry * ux) <= PIERCE_HALF_WIDTH * TILE_SIZE) hits.push({ e, along });
  }
  hits.sort((a, b) => a.along - b.along);
  const struck = hits.slice(0, lv.pierce).map((h) => h.e);
  for (const e of struck) resolveHit(world, e, shot);
  const end = struck.length ? struck[struck.length - 1] : target;
  world.events.push({ type: 'beam', x1: tower.x, y1: tower.y, x2: end.x, y2: end.y, kind: 'rail' });
  return struck;
}

function fire(world, tower, target, s) {
  const lv = towerLevel(tower);
  const aa = tower.def.family === 'anti-air';
  let damage = s.damage;
  if (lv.crit && world.rng.chance(lv.crit)) damage *= CRIT_MULT;
  const mods = { aa, airBonus: lv.airBonus ?? 0, canHitAir: aa };
  const shot = { damage, mods, effects: effectsOf(lv), towerId: tower.id };

  if (lv.pierce) return fireLine(world, tower, target, shot, lv, s.rangePx);
  if (lv.chains) return chainLightning(world, tower, target, damage, lv, mods, aa);
  if (lv.fieldRadius) return addGasField(world, tower, target.x, target.y, lv);
  const origin = tower.typeId === 'interceptor_drone' ? dronePosition(world, tower) : tower;
  return spawnProjectile(world, tower, target, shot, { splash: (lv.splash ?? 0) * TILE_SIZE, origin });
}

export function updateTowers(world, dt) {
  for (const tower of world.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    let s = towerStats(tower);
    if (s.baseRate <= 0 || s.range <= 0) continue; // no attack (Logistics Hub)
    const target = selectTarget(
      { x: tower.x, y: tower.y, range: s.rangePx, canHitAir: canHitAir(tower.def) },
      world.enemies,
      tower.targeting
    );
    if (tower.def.special?.spoolUp) {
      tower.spool = target ? tower.spool + dt : 0;
      s = towerStats(tower);
    }
    if (!target || tower.cooldown > 0) continue;
    fire(world, tower, target, s);
    tower.cooldown = 1 / s.rate;
  }
}
