import { positionAt } from '../core/path.js';
import { spawnEnemy } from './enemies.js';
import { towers } from '../data/towers.js';
import { createWorld } from './world.js';

/** Dev sandbox: level 1 map, every tower, lots of coins and base HP. */
export function createSandboxWorld(seed = 1) {
  return createWorld(1, { seed, unlocked: towers.map((t) => t.id), coins: 99999, hp: 1000 });
}

/** Mixed test wave: 5 grunts, 3 drones, 1 tank, staggered along their routes. Works in any phase. */
export function spawnTestWave(world) {
  const plan = [...Array(5).fill('grunt'), ...Array(3).fill('drone'), 'tank'];
  const made = [];
  plan.forEach((id, i) => {
    const e = spawnEnemy(world, id);
    e.distance = i * 36;
    const p = positionAt(e.path, e.distance);
    e.x = p.x;
    e.y = p.y;
    made.push(e);
  });
  return made;
}
