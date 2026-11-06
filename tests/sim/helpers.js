import { createWorld, step, STEP } from '../../src/sim/world.js';
import { spawnEnemy } from '../../src/sim/enemies.js';
import { placeTower } from '../../src/sim/commands.js';
import { positionAt } from '../../src/core/path.js';
import { towers } from '../../src/data/towers.js';

/** Level 1, every tower unlocked, lots of coins. */
export function sandbox(seed = 1) {
  return createWorld(1, { seed, unlocked: towers.map((t) => t.id), coins: 99999 });
}

/** Spawn an enemy at `distance` px along its route; frozen in place by default. */
export function enemyAt(w, id, distance, { frozen = true } = {}) {
  const e = spawnEnemy(w, id);
  e.distance = distance;
  const p = positionAt(e.path, distance);
  e.x = p.x;
  e.y = p.y;
  if (frozen) e.speed = 0;
  return e;
}

export function place(w, id, tx, ty) {
  const r = placeTower(w, id, tx, ty);
  if (!r.ok) throw new Error(`place ${id} failed: ${r.reason}`);
  return r.tower;
}

export function run(w, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) step(w, STEP);
}

/** Step until an event of `type` appears (max 5 s). */
export function runUntilEvent(w, type, max = 5) {
  for (let t = 0; t < max; t += STEP) {
    step(w, STEP);
    if (w.events.some((e) => e.type === type)) return true;
  }
  return false;
}
