import { enemies } from '../data/enemies.js';
import { bosses } from '../data/bosses.js';
import { getTowerDef } from '../sim/towers.js';

const enemyDefs = new Map([...enemies, ...bosses].map((d) => [d.id, d]));
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Tower Performance rows from `world.stats.towers` values (sold towers included).
 * in:  {id,typeId,damage,kills,spent}[]   out: adds name, dpc (damage per coin spent), sorted by damage.
 */
export function summarizeTowerStats(list) {
  return list
    .map((t) => ({
      ...t,
      name: getTowerDef(t.typeId)?.name ?? t.typeId,
      damage: Math.round(t.damage),
      dpc: t.spent > 0 ? round2(t.damage / t.spent) : 0,
    }))
    .sort((a, b) => b.damage - a.damage || a.id - b.id);
}

/**
 * Enemy Intel rows from `world.stats.enemies` ({defId: {seen,killed,leaked}}), only types encountered.
 * out: {id,name,type,hp,speed,sprite,boss,seen,killed,leaked}
 */
export function summarizeEnemyStats(map) {
  return Object.entries(map)
    .filter(([, s]) => s.seen > 0)
    .map(([id, s]) => {
      const d = enemyDefs.get(id);
      return {
        id,
        name: d?.name ?? id,
        type: d?.type ?? 'ground',
        hp: d?.hp ?? 0,
        speed: d?.speed ?? 0,
        sprite: d?.sprite ?? `enemies/${id}`,
        boss: d?.boss === true,
        seen: s.seen ?? 0,
        killed: s.killed ?? 0,
        leaked: s.leaked ?? 0,
      };
    })
    .sort((a, b) => (a.hp - b.hp) || a.id.localeCompare(b.id));
}
