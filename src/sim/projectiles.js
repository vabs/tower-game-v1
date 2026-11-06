import { TILE_SIZE } from '../core/grid.js';

/** Projectile speed in tiles/s by tower family. Slow shells for explosive. */
const FAMILY_SPEED = { explosive: 12 };
const DEFAULT_SPEED = 18;

export function projectileSpeed(family) {
  return (FAMILY_SPEED[family] ?? DEFAULT_SPEED) * TILE_SIZE;
}

export function spawnProjectile(world, tower, target, damage) {
  world.projectiles.push({
    id: world.nextId++,
    x: tower.x,
    y: tower.y,
    target,
    damage,
    speed: projectileSpeed(tower.def.family),
    family: tower.def.family,
    towerId: tower.id,
  });
}

export function applyDamage(world, enemy, damage, towerId) {
  if (enemy.dead || enemy.leaked) return;
  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    world.coins += enemy.coins;
    const tower = world.towers.find((t) => t.id === towerId);
    if (tower) tower.kills++;
    world.events.push({ type: 'kill', enemyId: enemy.id, defId: enemy.defId, coins: enemy.coins, x: enemy.x, y: enemy.y });
  }
}

/** Fly toward the target's current position; discard if it died or leaked. */
export function updateProjectiles(world, dt) {
  const alive = [];
  for (const p of world.projectiles) {
    const t = p.target;
    if (t.dead || t.leaked) continue;
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const dist = Math.hypot(dx, dy);
    const move = p.speed * dt;
    if (dist <= move) {
      applyDamage(world, t, p.damage, p.towerId);
      world.events.push({ type: 'hit', x: t.x, y: t.y });
      continue;
    }
    p.x += (dx / dist) * move;
    p.y += (dy / dist) * move;
    alive.push(p);
  }
  world.projectiles = alive;
}
