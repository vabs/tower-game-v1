import { TILE_SIZE } from '../core/grid.js';
import { selectTarget } from '../systems/targeting.js';
import { towers as towerDefs } from '../data/towers.js';
import { spawnProjectile } from './projectiles.js';

const defById = new Map(towerDefs.map((d) => [d.id, d]));

export function getTowerDef(id) {
  return defById.get(id);
}

/** Only the Anti-Air family hits air (decision 8). */
export function canHitAir(def) {
  return def.family === 'anti-air';
}

export function towerStats(tower) {
  const lv = tower.def.levels[tower.level - 1];
  return { damage: lv.damage, rate: lv.rate, range: lv.range, rangePx: lv.range * TILE_SIZE, dps: lv.damage * lv.rate };
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
  };
}

export function updateTowers(world, dt) {
  for (const tower of world.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    if (tower.cooldown > 0) continue;
    const s = towerStats(tower);
    const target = selectTarget(
      { x: tower.x, y: tower.y, range: s.rangePx, canHitAir: canHitAir(tower.def) },
      world.enemies,
      tower.targeting
    );
    if (!target) continue;
    spawnProjectile(world, tower, target, s.damage);
    tower.cooldown = 1 / s.rate;
  }
}
