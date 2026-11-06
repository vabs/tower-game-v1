import { TILE_SIZE } from '../core/grid.js';
import { applyDamage, shotDamage } from './damage.js';

/** Remaining-time based status effects. Enemy.status = { slow, burn, stun, paint, armor }. */

/** Strongest slow wins; equal strength refreshes to the longer duration. Never stacks. */
export function applySlow(enemy, factor, duration) {
  const cur = enemy.status.slow;
  if (!cur || factor > cur.factor) enemy.status.slow = { factor, remaining: duration };
  else if (factor === cur.factor) cur.remaining = Math.max(cur.remaining, duration);
}

export function applyBurn(enemy, dps, duration, towerId) {
  const cur = enemy.status.burn;
  if (!cur || dps > cur.dps) enemy.status.burn = { dps, remaining: duration, towerId };
  else if (dps === cur.dps) cur.remaining = Math.max(cur.remaining, duration);
}

export function applyStun(enemy, duration) {
  const cur = enemy.status.stun;
  if (!cur || duration > cur.remaining) enemy.status.stun = { remaining: duration };
}

/** kind: 'paint' (Target Painter) | 'armor' (Armor Breaker). Strongest of each kind wins. */
export function applyMark(enemy, kind, amount, duration) {
  const cur = enemy.status[kind];
  if (!cur || amount > cur.amount) enemy.status[kind] = { amount, remaining: duration };
  else if (amount === cur.amount) cur.remaining = Math.max(cur.remaining, duration);
}

/** 0 while stunned, otherwise 1 - slow. */
export function speedMultiplier(enemy) {
  const s = enemy.status;
  if (s.stun) return 0;
  return 1 - (s.slow?.factor ?? 0);
}

/**
 * Gas Projector field: a ground zone. A tower that fires again near its own
 * live field refreshes it instead of stacking a second one.
 */
export function addGasField(world, tower, x, y, lv) {
  const radius = lv.fieldRadius * TILE_SIZE;
  const existing = world.fields.find((f) => f.towerId === tower.id && Math.hypot(f.x - x, f.y - y) < radius * 0.5);
  const dps = lv.damage * lv.rate;
  if (existing) {
    existing.remaining = lv.fieldDuration;
    existing.slow = lv.fieldSlow;
    existing.dps = dps;
    return existing;
  }
  const field = { id: world.nextId++, x, y, radius, remaining: lv.fieldDuration, duration: lv.fieldDuration, slow: lv.fieldSlow, dps, towerId: tower.id };
  world.fields.push(field);
  return field;
}

/**
 * Shock Coil: strike `first`, then hop up to `lv.chains` times to the nearest
 * un-hit eligible enemy within 2 tiles of the previous one. Every enemy hit is slowed.
 * @returns {object[]} enemies struck, in order
 */
export function chainLightning(world, tower, first, damage, lv, mods, canHitAirFlag) {
  const struck = [first];
  const hit = new Set([first.id]);
  const strike = (e) => {
    applyDamage(world, e, shotDamage(damage, e, mods), tower.id);
    if (!e.dead) applySlow(e, lv.chainSlow, lv.chainSlowDuration);
  };
  strike(first);
  let cur = first;
  for (let i = 0; i < (lv.chains ?? 0); i++) {
    let best = null;
    let bestD = 2 * TILE_SIZE;
    for (const e of world.enemies) {
      if (e.dead || e.leaked || hit.has(e.id) || (e.air && !canHitAirFlag)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d <= bestD) { best = e; bestD = d; }
    }
    if (!best) break;
    hit.add(best.id);
    struck.push(best);
    strike(best);
    cur = best;
  }
  world.events.push({
    type: 'chain',
    points: [{ x: tower.x, y: tower.y }, ...struck.map((e) => ({ x: e.x, y: e.y }))],
  });
  return struck;
}

/** Tick timers, burn damage and gas fields. Runs before enemy movement. */
export function updateEffects(world, dt) {
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    const s = e.status;
    if (s.burn) {
      const t = Math.min(dt, s.burn.remaining);
      applyDamage(world, e, s.burn.dps * t, s.burn.towerId);
      s.burn.remaining -= dt;
      if (s.burn.remaining <= 0) delete s.burn;
    }
    for (const k of ['slow', 'stun', 'paint', 'armor']) {
      if (!s[k]) continue;
      s[k].remaining -= dt;
      if (s[k].remaining <= 0) delete s[k];
    }
  }
  if (world.fields.length) {
    for (const f of world.fields) {
      f.remaining -= dt;
      for (const e of world.enemies) {
        if (e.dead || e.leaked || e.air) continue; // ground only
        if (Math.hypot(e.x - f.x, e.y - f.y) > f.radius) continue;
        applySlow(e, f.slow, 0.25); // short refresh: slow fades soon after leaving
        applyDamage(world, e, f.dps * dt, f.towerId);
      }
    }
    world.fields = world.fields.filter((f) => f.remaining > 0);
  }
}
