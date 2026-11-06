// Upgrade cost formula (balance milestone). Run `node tools/upgrade-costs.mjs --write` to rewrite
// the `cost` of levels 2-5 in src/data/towers.js; L1 costs are kept.
//
//   power(level)  = what the tower contributes: damage*rate (+burn dot) scaled by range^0.5 and by
//                   splash / pierce / chain / crit / slow / stun factors; support towers use their
//                   aura or debuff strength instead.
//   cost(level k) = L1cost * (power(k) - power(k-1)) / power(1) / EFFICIENCY
//
// so every upgrade buys EFFICIENCY (85%) of the power per coin that a fresh L1 of the same tower
// buys. tests/upgrades.test.js enforces the 75-100% band for all towers.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EFFICIENCY = 0.85;

export function powerOf(lv, lv1) {
  if (lv.endWaveCoins) return lv.endWaveCoins;
  if (lv.fireRateBoost) return lv.fireRateBoost * lv.auraRange ** 2;
  if (lv.rangeBoost) return lv.rangeBoost * lv.range ** 2;
  if (lv.damageBoost) return lv.damageBoost * lv.boostDuration * lv.range ** 2;
  if (lv.armorDebuff) return lv.armorDebuff * lv.debuffDuration * lv.range ** 2;
  let dps = lv.damage * lv.rate;
  if (lv.burnDps) dps += lv.burnDps * 0.8;
  let f = Math.sqrt(lv.range / lv1.range);
  if (lv.splash) f *= 1 + 0.5 * lv.splash;
  if (lv.pierce) f *= 1 + 0.3 * (lv.pierce - 1);
  if (lv.chains) f *= 1 + 0.5 * (lv.chains - 1);
  if (lv.crit) f *= 1 + lv.crit;
  if (lv.slow) f *= 1 + 2 * lv.slow;
  if (lv.chainSlow) f *= 1 + 2 * lv.chainSlow;
  if (lv.fieldSlow) f *= (1 + 2 * lv.fieldSlow) * (lv.fieldDuration / lv1.fieldDuration) ** 0.5;
  if (lv.stun) f *= 1 + 2 * lv.stun;
  if (lv.airBonus) f *= 1 + 0.5 * lv.airBonus;
  return dps * f;
}

export function upgradeCostsFor(def, { round = 5 } = {}) {
  const lv1 = def.levels[0];
  const p1 = powerOf(lv1, lv1);
  return def.levels.map((lv, i) => {
    if (i === 0) return lv.cost;
    const dp = powerOf(lv, lv1) - powerOf(def.levels[i - 1], lv1);
    const raw = (lv1.cost * dp) / p1 / EFFICIENCY;
    return Math.max(round, Math.round(raw / round) * round);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../src/data/towers.js', import.meta.url);
  const { towers } = await import('../src/data/towers.js');
  let src = readFileSync(file, 'utf8');
  for (const def of towers) {
    const costs = upgradeCostsFor(def);
    const start = src.indexOf(`id: '${def.id}'`);
    const end = src.indexOf('\n  },', start);
    let block = src.slice(start, end);
    def.levels.forEach((lv, i) => {
      block = block.replace(new RegExp(`(level: ${i + 1},[^\\n]*?cost: )${lv.cost}`), `$1${costs[i]}`);
    });
    src = src.slice(0, start) + block + src.slice(end);
    console.log(def.id.padEnd(18), def.levels.map((l) => l.cost).join(' '), '->', costs.join(' '));
  }
  if (process.argv.includes('--write')) writeFileSync(file, src);
}
