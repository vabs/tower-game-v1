import { TILE_SIZE } from '../core/grid.js';
import { positionAt } from '../core/path.js';
import { enemies as enemyDefs } from '../data/enemies.js';
import { speedMultiplier } from './effects.js';

/** speed 1.0 == 1.5 tiles per second (decision 2). */
export const TILES_PER_SPEED = 1.5;

/** Decision 12: leak damage tier by base HP. */
export function leakDamage(hp) {
  if (hp < 100) return 1;
  if (hp < 200) return 2;
  if (hp < 300) return 3;
  if (hp < 400) return 4;
  return 5;
}

const defById = new Map(enemyDefs.map((d) => [d.id, d]));

/**
 * Create an enemy at the spawn point and add it to the world.
 * Air units fly a straight line spawn -> goal (decision 7).
 */
export function spawnEnemy(world, defId, pathIndex = 0) {
  const def = defById.get(defId);
  if (!def) throw new Error(`unknown enemy ${defId}`);
  const air = def.type === 'air';
  const ground = world.map.paths[pathIndex];
  const path = air ? [ground[0], ground[ground.length - 1]] : ground;
  const length = air
    ? Math.hypot(path[1].x - path[0].x, path[1].y - path[0].y)
    : world.map.pathLengths[pathIndex];
  const enemy = {
    id: world.nextId++,
    defId,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    coins: def.coins,
    leak: leakDamage(def.hp),
    distance: 0,
    pathIndex,
    path,
    length,
    x: path[0].x,
    y: path[0].y,
    air,
    status: {},
    dead: false,
    leaked: false,
  };
  world.enemies.push(enemy);
  return enemy;
}

/** Move enemies, resolve leaks, drop dead/leaked. */
export function updateEnemies(world, dt) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    e.distance += e.speed * speedMultiplier(e) * TILES_PER_SPEED * TILE_SIZE * dt;
    if (e.distance >= e.length) {
      e.leaked = true;
      world.hp = Math.max(0, world.hp - e.leak);
      world.events.push({ type: 'leak', enemyId: e.id, damage: e.leak });
      continue;
    }
    const p = positionAt(e.path, e.distance);
    e.x = p.x;
    e.y = p.y;
  }
  world.enemies = world.enemies.filter((e) => !e.dead && !e.leaked);
}
