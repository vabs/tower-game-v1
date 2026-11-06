import { enemies } from '../data/enemies.js';
import { bosses } from '../data/bosses.js';
import { scaledHp } from '../data/waves.js';

const defById = new Map([...enemies, ...bosses].map((d) => [d.id, d]));

/**
 * Pure summary of one wave for the preview card.
 * @param {{enemies:{id:string,count:number}[],supply?:boolean,coins?:number}|undefined} wave
 * @param {number} level
 * @param {{hpMult?:number}} [opts]
 * @returns {null|{supply:boolean,coins:number,total:number,hasAir:boolean,hasBoss:boolean,
 *   groups:{id:string,name:string,count:number,air:boolean,boss:boolean,hp:number,sprite:string}[]}}
 */
export function summarizeWave(wave, level, { hpMult = 1 } = {}) {
  if (!wave) return null;
  const groups = [];
  for (const g of wave.enemies ?? []) {
    const def = defById.get(g.id);
    if (!def) continue;
    // Merge repeated ids so the card stays short.
    const existing = groups.find((x) => x.id === g.id);
    if (existing) { existing.count += g.count; continue; }
    groups.push({
      id: g.id,
      name: def.name,
      count: g.count,
      air: def.type === 'air',
      boss: def.boss === true,
      hp: Math.round(scaledHp(def, level, hpMult)),
      sprite: def.sprite ?? `enemies/${g.id}`,
    });
  }
  return {
    supply: wave.supply === true,
    coins: wave.supply ? wave.coins ?? 0 : 0,
    total: groups.reduce((a, g) => a + g.count, 0),
    hasAir: groups.some((g) => g.air),
    hasBoss: groups.some((g) => g.boss),
    groups,
  };
}
