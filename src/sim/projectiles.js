import { TILE_SIZE } from '../core/grid.js';
import { applyDamage, shotDamage } from './damage.js';
import { applySlow, applyBurn, applyStun, applyMark } from './effects.js';

export { applyDamage };

/** Projectile speed in tiles/s by tower family. Slow shells for explosive. */
const FAMILY_SPEED = { explosive: 12 };
const DEFAULT_SPEED = 18;

export function projectileSpeed(family) {
  return (FAMILY_SPEED[family] ?? DEFAULT_SPEED) * TILE_SIZE;
}

const FAMILY_KIND = { assault: 'bullet', precision: 'bullet', explosive: 'shell', control: 'bullet', support: 'bullet', 'anti-air': 'bullet' };
const TOWER_KIND = {
  gauss_rifle: 'rail', coilgun: 'rail', longshot_beacon: 'rail', laser_aa: 'rail', rail_autocannon: 'rail',
  mortar: 'mortar', rocket_pod: 'rocket', cryo_sprayer: 'cryo', incendiary_turret: 'flame', emp_node: 'emp',
  sam_site: 'missile', interceptor_drone: 'missile', flak_cannon: 'shell',
};
/** Indirect fire: arcs to where the target was at fire time. */
const INDIRECT = { mortar: { speed: 8 }, howitzer: { speed: 9 } };

export function projectileKind(typeId, family) {
  return TOWER_KIND[typeId] ?? FAMILY_KIND[family] ?? 'bullet';
}

/** Extra effects carried by a shot, derived from the tower level row. */
export function effectsOf(lv) {
  const fx = {};
  if (lv.slow) fx.slow = { factor: lv.slow, duration: lv.slowDuration ?? 1 };
  if (lv.burnDps) fx.burn = { dps: lv.burnDps, duration: lv.burnDuration ?? 1 };
  if (lv.stun) fx.stun = lv.stun;
  if (lv.damageBoost) fx.paint = { amount: lv.damageBoost, duration: lv.boostDuration ?? 1 };
  if (lv.armorDebuff) fx.armor = { amount: lv.armorDebuff, duration: lv.debuffDuration ?? 1 };
  return fx;
}

/**
 * Damage one enemy from a shot and apply its status effects.
 * shot: { damage, mods:{aa,airBonus,canHitAir}, effects, towerId }
 */
export function resolveHit(world, enemy, shot) {
  if (enemy.dead || enemy.leaked) return;
  applyDamage(world, enemy, shotDamage(shot.damage, enemy, shot.mods), shot.towerId);
  if (enemy.dead) return;
  const fx = shot.effects;
  if (!fx) return;
  if (fx.slow) applySlow(enemy, fx.slow.factor, fx.slow.duration);
  if (fx.burn) applyBurn(enemy, fx.burn.dps, fx.burn.duration, shot.towerId);
  if (fx.stun) applyStun(enemy, fx.stun);
  if (fx.paint) applyMark(enemy, 'paint', fx.paint.amount, fx.paint.duration);
  if (fx.armor) applyMark(enemy, 'armor', fx.armor.amount, fx.armor.duration);
}

/** Everything alive within `radius` px of (x,y) that the shot may hit takes full damage. */
export function splashImpact(world, x, y, radius, shot) {
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    if (e.air && !shot.mods.canHitAir) continue;
    if (Math.hypot(e.x - x, e.y - y) <= radius) resolveHit(world, e, shot);
  }
  world.events.push({ type: 'splash', x, y, radius });
}

/**
 * Launch a projectile. `shot` is the damage package, `opts`: { splash (px), origin {x,y} }.
 * Indirect towers (mortar, howitzer) aim at the target's position now and arc there;
 * the rest home in on the target.
 */
export function spawnProjectile(world, tower, target, shot, opts = {}) {
  const origin = opts.origin ?? tower;
  const indirect = INDIRECT[tower.typeId];
  const speed = indirect ? indirect.speed * TILE_SIZE : projectileSpeed(tower.def.family);
  const p = {
    id: world.nextId++,
    x: origin.x,
    y: origin.y,
    sx: origin.x,
    sy: origin.y,
    tx: target.x,
    ty: target.y,
    target,
    homing: !indirect,
    arc: !!indirect,
    progress: 0,
    angle: Math.atan2(target.y - origin.y, target.x - origin.x),
    kind: projectileKind(tower.typeId, tower.def.family),
    splash: opts.splash ?? 0,
    shot: { ...shot, towerId: tower.id },
    damage: shot.damage,
    speed,
    family: tower.def.family,
    towerId: tower.id,
  };
  world.projectiles.push(p);
  return p;
}

function land(world, p) {
  if (p.splash > 0) {
    splashImpact(world, p.tx, p.ty, p.splash, p.shot);
    return;
  }
  resolveHit(world, p.target, p.shot);
  world.events.push({ type: 'hit', x: p.tx, y: p.ty });
}

/** Fly toward the target (or the fixed aim point). */
export function updateProjectiles(world, dt) {
  const alive = [];
  const total = (p) => Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1;
  for (const p of world.projectiles) {
    if (p.homing) {
      const t = p.target;
      if (t && !t.dead && !t.leaked) { p.tx = t.x; p.ty = t.y; }
      else if (p.splash <= 0) continue; // plain shot: target gone, discard
      // splash shot: finish the flight and detonate at the last known position
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const move = p.speed * dt;
    if (dist <= move) {
      land(world, p);
      continue;
    }
    p.angle = Math.atan2(dy, dx);
    p.x += (dx / dist) * move;
    p.y += (dy / dist) * move;
    if (p.arc) p.progress = Math.min(1, 1 - Math.hypot(p.tx - p.x, p.ty - p.y) / total(p));
    alive.push(p);
  }
  world.projectiles = alive;
}
