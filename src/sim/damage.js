/** Only the Anti-Air family hits air (decision 8). */
export function canHitAir(def) {
  return def.family === 'anti-air';
}

/** Anti-Air damage vs ground (decision 8). */
export const AA_GROUND_FACTOR = 0.6;
export const CRIT_MULT = 2;

/** Target Painter + Armor Breaker add up (decision 14). Each kind takes the strongest source. */
export function damageTakenMultiplier(enemy) {
  const s = enemy.status;
  return 1 + (s.paint?.amount ?? 0) + (s.armor?.amount ?? 0);
}

/**
 * Final damage of one shot on one enemy.
 * mods: { aa:boolean, airBonus:number } — AA does +airBonus vs air and 60% vs ground.
 */
export function shotDamage(base, enemy, mods = {}) {
  let d = base;
  if (mods.aa) d *= enemy.air ? 1 + (mods.airBonus ?? 0) : AA_GROUND_FACTOR;
  return d * damageTakenMultiplier(enemy);
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
