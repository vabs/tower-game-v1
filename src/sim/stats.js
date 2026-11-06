/**
 * Run statistics for analytics screens (design section 6).
 * @typedef {{id:number,typeId:string,damage:number,kills:number,spent:number}} TowerStat
 * @typedef {{seen:number,killed:number,leaked:number}} EnemyStat
 * @typedef {{towers:Record<number,TowerStat>,enemies:Record<string,EnemyStat>,hpLost:number}} Stats
 */

/** @returns {Stats} */
export function createStats() {
  return { towers: {}, enemies: {}, hpLost: 0 };
}

export function registerTower(world, tower) {
  world.stats.towers[tower.id] = { id: tower.id, typeId: tower.typeId, damage: 0, kills: 0, spent: tower.spent };
}

export function enemyStat(world, defId) {
  return (world.stats.enemies[defId] ??= { seen: 0, killed: 0, leaked: 0 });
}

/** Effective damage (overkill excluded) and kills credited to the tower that caused them. */
export function creditDamage(world, towerId, dealt, killed) {
  const t = world.stats.towers[towerId];
  if (!t) return;
  t.damage += dealt;
  if (killed) t.kills++;
}

export function creditSpend(world, towerId, coins) {
  const t = world.stats.towers[towerId];
  if (t) t.spent += coins;
}

/** Snapshot for UI/save: tower list (including sold towers) and run totals. */
export function snapshotStats(world) {
  return {
    towers: Object.values(world.stats.towers).map((t) => ({ ...t })),
    enemies: Object.fromEntries(Object.entries(world.stats.enemies).map(([k, v]) => [k, { ...v }])),
    hpLost: world.stats.hpLost,
    time: world.time,
  };
}
