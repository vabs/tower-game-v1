import { TILE_SIZE } from '../core/grid.js';
import { positionAt } from '../core/path.js';
import { enemies as enemyDefs } from '../data/enemies.js';
import { rosterForLevel, scaledHp } from '../data/waves.js';
import { spawnEnemy } from './enemies.js';

/** Boss phases (pure sim). Below 50% HP a boss calls escorts; below 25% it enrages. */
export const BOSS_ESCORT_AT = 0.5;
export const BOSS_ENRAGE_AT = 0.25;
export const ESCORT_HP_SHARE = 0.1; // total escort HP as a share of the boss's max HP
export const ESCORT_MIN = 4;
export const ESCORT_MAX = 6;
export const ENRAGE_SPEED = 1.2;
const ESCORT_SPACING = TILE_SIZE * 0.4;

const defOf = new Map(enemyDefs.map((d) => [d.id, d]));

/**
 * Escort type and count for a boss: same movement type (ground boss -> ground escorts, air -> air)
 * from the level roster, the type whose natural count for the HP budget is closest to 5.
 * Each escort gets budget / count HP so the group totals exactly ESCORT_HP_SHARE of the boss's max HP.
 */
export function escortPlan(level, boss, hpMult = 1) {
  const budget = boss.maxHp * ESCORT_HP_SHARE;
  const ids = rosterForLevel(level).filter((id) => defOf.get(id).type === (boss.air ? 'air' : 'ground'));
  let best = null;
  for (const id of ids) {
    const natural = budget / scaledHp(defOf.get(id), level, hpMult);
    const count = Math.max(ESCORT_MIN, Math.min(ESCORT_MAX, Math.round(natural)));
    const miss = Math.abs(Math.log(natural / 5));
    if (!best || miss < best.miss) best = { id, count, miss };
  }
  if (!best) return null;
  return { id: best.id, count: best.count, hp: budget / best.count };
}

function callEscorts(world, boss) {
  const plan = escortPlan(world.level, boss, world.difficulty?.hpMult ?? 1);
  if (!plan) return;
  const made = [];
  for (let i = 0; i < plan.count; i++) {
    const e = spawnEnemy(world, plan.id, boss.pathIndex);
    e.hp = e.maxHp = plan.hp;
    e.distance = Math.max(0, boss.distance - i * ESCORT_SPACING);
    const p = positionAt(e.path, e.distance);
    e.x = p.x;
    e.y = p.y;
    made.push(e);
  }
  world.events.push({ type: 'bossPhase', phase: 'escorts', enemyId: boss.id, count: made.length, x: boss.x, y: boss.y });
}

/** Trigger boss phases once each. Call once per step after enemy movement. */
export function updateBossPhases(world) {
  for (const e of world.enemies) {
    if (!e.boss || e.dead || e.leaked || e.hp <= 0) continue;
    const fr = e.hp / e.maxHp;
    if (fr < BOSS_ESCORT_AT && !e.escortsCalled) {
      e.escortsCalled = true;
      callEscorts(world, e);
    }
    if (fr < BOSS_ENRAGE_AT && !e.enraged) {
      e.enraged = true;
      e.speed *= ENRAGE_SPEED;
      world.events.push({ type: 'bossPhase', phase: 'enrage', enemyId: e.id, x: e.x, y: e.y });
    }
  }
}
