import { TILE_SIZE } from '../core/grid.js';

/**
 * Recompute fire-rate and range auras for every tower. Call after place/sell/upgrade.
 * Ammo Feeder: fireRateBoost within auraRange. Command Uplink: rangeBoost within its range.
 * Multiple sources never stack: each aura kind takes the strongest source.
 */
/** Aura numbers of a source tower at its current level. */
function auraOf(src) {
  const lv = src.def.levels[src.level - 1];
  const fireRate = lv.fireRateBoost ?? 0;
  const range = lv.rangeBoost ?? 0;
  return { fireRate, range, radius: (lv.auraRange ?? lv.range ?? 0) * TILE_SIZE };
}

/** Towers inside `src`'s aura (empty when `src` is not a support source). Read-only. */
export function auraTargetsOf(world, src) {
  const a = auraOf(src);
  if (!a.fireRate && !a.range) return [];
  return world.towers.filter((t) => t !== src && Math.hypot(t.x - src.x, t.y - src.y) <= a.radius);
}

/**
 * Every aura source reaching `tower`, with whether it is the one that applies (strongest per kind wins).
 * @returns {{id:number,name:string,kind:'fireRate'|'range',amount:number,applied:boolean}[]}
 */
export function auraSourcesFor(world, tower) {
  const out = [];
  for (const src of world.towers) {
    if (src === tower) continue;
    const a = auraOf(src);
    if (!a.fireRate && !a.range) continue;
    if (Math.hypot(tower.x - src.x, tower.y - src.y) > a.radius) continue;
    if (a.fireRate) out.push({ id: src.id, name: src.def.name, kind: 'fireRate', amount: a.fireRate, applied: false });
    if (a.range) out.push({ id: src.id, name: src.def.name, kind: 'range', amount: a.range, applied: false });
  }
  for (const kind of ['fireRate', 'range']) {
    const best = out.filter((o) => o.kind === kind).sort((x, y) => y.amount - x.amount || x.id - y.id)[0];
    if (best) best.applied = true;
  }
  return out;
}

export function recomputeAuras(world) {
  for (const t of world.towers) t.aura = { fireRate: 0, range: 0 };
  for (const src of world.towers) {
    const lv = src.def.levels[src.level - 1];
    const fr = lv.fireRateBoost ?? 0;
    const rg = lv.rangeBoost ?? 0;
    if (!fr && !rg) continue;
    const radius = (lv.auraRange ?? lv.range ?? 0) * TILE_SIZE;
    for (const t of world.towers) {
      if (t === src) continue;
      if (Math.hypot(t.x - src.x, t.y - src.y) > radius) continue;
      if (fr > t.aura.fireRate) t.aura.fireRate = fr;
      if (rg > t.aura.range) t.aura.range = rg;
    }
  }
}
