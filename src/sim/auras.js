import { TILE_SIZE } from '../core/grid.js';

/**
 * Recompute fire-rate and range auras for every tower. Call after place/sell/upgrade.
 * Ammo Feeder: fireRateBoost within auraRange. Command Uplink: rangeBoost within its range.
 * Multiple sources never stack: each aura kind takes the strongest source.
 */
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
