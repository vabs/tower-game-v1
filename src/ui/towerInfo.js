import { canHitAir } from '../sim/damage.js';

export const FAMILY_ROLE = {
  assault: 'Fast single-target fire',
  precision: 'Long-range heavy hits',
  explosive: 'Area damage',
  control: 'Slows, burns and stuns',
  support: 'Buffs nearby towers, income',
  'anti-air': 'Shoots air; 60% damage to ground',
};

const pct = (n) => Math.round(n * 100);

/** Special-effect lines for one level row of a tower def (no live aura line). */
export function levelSpecial(def, lv) {
  const out = [];
  if (def.special?.spoolUp) out.push(`Spool-up ${def.special.spoolUp}s`);
  if (lv.crit) out.push(`Crit ${pct(lv.crit)}% (2x)`);
  if (lv.pierce) out.push(`Pierce ${lv.pierce}`);
  if (lv.splash) out.push(`Splash ${lv.splash} tiles`);
  if (lv.airBonus) out.push(`+${pct(lv.airBonus)}% vs air, 60% vs ground`);
  if (lv.slow) out.push(`Slow ${pct(lv.slow)}% for ${lv.slowDuration}s`);
  if (lv.burnDps) out.push(`Burn ${lv.burnDps}/s for ${lv.burnDuration}s`);
  if (lv.stun) out.push(`Stun ${lv.stun}s`);
  if (lv.chains) out.push(`Chain ${lv.chains} hops, slow ${pct(lv.chainSlow)}%`);
  if (lv.fieldRadius) out.push(`Gas field ${lv.fieldDuration}s, slow ${pct(lv.fieldSlow)}%`);
  if (lv.damageBoost) out.push(`Marked +${pct(lv.damageBoost)}% dmg taken`);
  if (lv.armorDebuff) out.push(`Armor -${pct(lv.armorDebuff)}%`);
  if (lv.fireRateBoost) out.push(`Aura +${pct(lv.fireRateBoost)}% fire rate (${lv.auraRange} tiles)`);
  if (lv.rangeBoost) out.push(`Aura +${pct(lv.rangeBoost)}% range (${lv.range} tiles)`);
  if (lv.endWaveCoins) out.push(`+${lv.endWaveCoins} coins per wave`);
  return out;
}

/** Shop-card facts for a fresh level-1 tower. */
export function towerCardInfo(def) {
  const lv = def.levels[0];
  const damage = lv.damage ?? 0;
  const rate = lv.rate ?? 0;
  return {
    name: def.name,
    family: def.family,
    role: FAMILY_ROLE[def.family] ?? '',
    cost: lv.cost,
    damage,
    rate,
    range: lv.range ?? 0,
    dps: damage * rate,
    special: levelSpecial(def, lv),
    air: canHitAir(def),
  };
}

const sign = (n, digits = 0) => `${n >= 0 ? '+' : ''}${digits ? n.toFixed(digits).replace(/\.?0+$/, '') : Math.round(n)}`;

/**
 * What the next upgrade buys. `level` is the current level (1-4), `cost` what it costs right now.
 * `auraRate` is the fire-rate aura the tower currently receives (scales the DPS gain).
 * @returns {null|{toLevel:number,cost:number,dDamage:number,dRate:number,dRange:number,dDps:number,dpsPerCoin:number,text:string}}
 */
export function upgradeDelta(def, level, cost, auraRate = 0) {
  const cur = def.levels[level - 1];
  const next = def.levels[level];
  if (!cur || !next) return null;
  const mult = 1 + auraRate;
  const dDamage = (next.damage ?? 0) - (cur.damage ?? 0);
  const dRate = ((next.rate ?? 0) - (cur.rate ?? 0)) * mult;
  const dRange = (next.range ?? 0) - (cur.range ?? 0);
  const dDps = (next.damage ?? 0) * (next.rate ?? 0) * mult - (cur.damage ?? 0) * (cur.rate ?? 0) * mult;
  const parts = [];
  if (dDamage) parts.push(`${sign(dDamage)} dmg`);
  if (Math.abs(dRate) >= 0.005) parts.push(`${sign(dRate, 2)} rate`);
  if (Math.abs(dRange) >= 0.005) parts.push(`${sign(dRange, 1)} range`);
  const dFr = (next.fireRateBoost ?? 0) - (cur.fireRateBoost ?? 0);
  const dRg = (next.rangeBoost ?? 0) - (cur.rangeBoost ?? 0);
  if (dFr) parts.push(`${sign(dFr * 100)}% rate aura`);
  if (dRg) parts.push(`${sign(dRg * 100)}% range aura`);
  const dCoins = (next.endWaveCoins ?? 0) - (cur.endWaveCoins ?? 0);
  if (dCoins) parts.push(`${sign(dCoins)} coins/wave`);
  const dpsPerCoin = cost > 0 ? dDps / cost : 0;
  let text = parts.join(', ') || 'No stat change';
  if (Math.abs(dDps) >= 0.5) text += ` → ${sign(dDps, 1)} DPS (${dpsPerCoin.toFixed(2)}/coin)`;
  return { toLevel: level + 1, cost, dDamage, dRate, dRange, dDps, dpsPerCoin, text };
}

/** Lines for the selected-tower buff list, e.g. "+12% rate from Ammo Feeder". */
export function describeBuffs(sources) {
  return sources.map((b) => ({
    text: `+${pct(b.amount)}% ${b.kind === 'fireRate' ? 'rate' : 'range'} from ${b.name}${b.applied ? '' : ' (weaker, not applied)'}`,
    applied: b.applied,
  }));
}
