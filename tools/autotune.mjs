// Fits LEVEL_TUNE / BOSS_TUNE in src/data/waves.js against BOTH bot profiles (Regular difficulty).
// usage: node tools/autotune.mjs [--iters 14] [--levels 2-50] [--gseeds 3] [--hseeds 10] [--write]
//
// Per level two deficits are measured (positive = too easy, negative = too hard):
//   greedy: mean HP-left fraction of the strong bot minus a chapter target ramp (95/85/80/80/75% +-5 across
//           the chapter, so difficulty rises inside a chapter);
//   human : 10th-percentile HP-left of the human proxy minus 0.30 (the requirement is 0.20; boss levels use
//           the proxy's mean HP-left minus 0.40 because the requirement there is only a win rate).
// Level moves:
//   - a level that misses the human floor or is more than 8 points under the greedy target is made easier (by the
//     worse of the two deficits);
//   - otherwise it moves by 0.6 * greedy deficit + 0.4 * (human mean HP-left minus the median of the human means of
//     the ordinary levels around it in the same chapter), so a level that is much easier or harder for humans than
//     its neighbours is pulled to them without touching anybody else's multiplier (no averaging of the tables).
// Boss levels share the correction between LEVEL_TUNE and BOSS_TUNE. The iterate that satisfies all targets
// with the best greedy/neighbour fit is kept per level. Changing the bots, towers, enemies or maps means
// re-running this.
import { readFileSync, writeFileSync } from 'node:fs';
import { sweep } from './sweep.mjs';
import { HUMAN_PROFILE } from './balance-bot.js';
import { levels } from '../src/data/levels.js';
import { LEVEL_TUNE, BOSS_TUNE } from '../src/data/waves.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const iters = Number(arg('iters', 14));
const [lo, hi] = String(arg('levels', '2-50')).split('-').map(Number);
const gSeeds = Number(arg('gseeds', 5));
const hSeeds = Number(arg('hseeds', 10));
const file = new URL('../src/data/waves.js', import.meta.url);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GREEDY_CHAPTER = [0.95, 0.85, 0.8, 0.8, 0.75];
const greedyTarget = (l) => Math.min(1, GREEDY_CHAPTER[Math.floor((l - 1) / 10)] + 0.05 - 0.1 * (((l - 1) % 10) / 9));
const isBoss = (l) => !!levels[l - 1].boss;
const frac = (r) => (r.won ? r.hp / r.maxHp : 0);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const p10 = (a) => [...a].sort((x, y) => x - y)[Math.floor(0.1 * a.length)];

async function measure() {
  const jobs = [];
  for (let l = lo; l <= hi; l++) {
    for (let s = 1; s <= gSeeds; s++) jobs.push({ level: l, seed: s, opts: {} });
    for (let s = 1; s <= hSeeds; s++) jobs.push({ level: l, seed: s, opts: HUMAN_PROFILE });
  }
  const res = await sweep(jobs, { level: [...LEVEL_TUNE], boss: [...BOSS_TUNE] });
  const out = new Map();
  let k = 0;
  for (let l = lo; l <= hi; l++) {
    const g = res.slice(k, k + gSeeds); k += gSeeds;
    const h = res.slice(k, k + hSeeds); k += hSeeds;
    const gHp = mean(g.map((r) => (r.won ? r.hp / r.maxHp : -(1 - Math.min(1, (r.waveReached - 1) / r.waves)) - (r.bossHpLeft > 0 ? 0.3 : 0))));
    const hFr = h.map(frac);
    const hWin = h.filter((r) => r.won).length / h.length;
    let hd = isBoss(l) ? mean(hFr) - 0.4 : p10(hFr) - 0.3;
    if (hWin < 0.9) hd = Math.min(hd, -0.1 - 0.5 * (0.9 - hWin));
    out.set(l, { gd: gHp - greedyTarget(l), hd, gHp, hWin, hP10: p10(hFr), hMean: mean(hFr) });
  }
  return out;
}

const medianDev = (m, l) => {
  const win = [l - 1, l, l + 1].filter((x) => x >= lo && x <= hi && !isBoss(x) && Math.floor((x - 1) / 10) === Math.floor((l - 1) / 10));
  const v = win.map((x) => m.get(x).hMean).sort((a, b) => a - b);
  return m.get(l).hMean - v[Math.floor(v.length / 2)];
};
const history = new Map();
for (let it = 0; it <= iters; it++) {
  const m = await measure();
  let line = '';
  for (let l = lo; l <= hi; l++) {
    const r = m.get(l);
    const dev = isBoss(l) ? 0 : medianDev(m, l);
    const easeNeed = Math.min(r.gd + 0.08, r.hd);
    const d = easeNeed < 0 ? Math.min(r.gd, r.hd) : 0.6 * r.gd + 0.4 * dev;
    const ok = r.hd >= 0 && r.gd >= -0.08 && r.hWin >= (isBoss(l) ? 0.8 : 0.9);
    (history.get(l) ?? history.set(l, []).get(l)).push({ L: LEVEL_TUNE[l - 1], B: BOSS_TUNE[l - 1], d, ok, gd: r.gd, score: 0.6 * Math.abs(r.gd) + 0.4 * Math.abs(dev) });
    line += `${l}:${r.gHp.toFixed(2)}/${r.hP10.toFixed(2)}/${Math.round(r.hWin * 100)}${ok ? '' : '*'} `;
    if (it === iters) continue;
    const f = clamp(1 + 0.6 * d, 0.7, 1.4);
    if (isBoss(l)) {
      BOSS_TUNE[l - 1] = clamp(BOSS_TUNE[l - 1] * Math.sqrt(f), 0.3, 1.8);
      LEVEL_TUNE[l - 1] = clamp(LEVEL_TUNE[l - 1] * Math.sqrt(f), 0.15, 3);
    } else LEVEL_TUNE[l - 1] = clamp(LEVEL_TUNE[l - 1] * f, 0.15, 3);
  }
  console.log(`iter ${it}: ${line}`);
}
for (let l = lo; l <= hi; l++) {
  const h = history.get(l);
  const oks = h.filter((x) => x.ok);
  const pick = oks.length ? oks.reduce((a, b) => (a.score <= b.score ? a : b)) : h.reduce((a, b) => (a.d >= b.d ? a : b));
  LEVEL_TUNE[l - 1] = pick.L;
  BOSS_TUNE[l - 1] = pick.B;
  if (!oks.length) console.log(`level ${l}: no iterate met every target, kept the best one`);
}
const fmt = (a) => '[' + a.map((v) => +v.toFixed(2)).join(', ') + ']';
console.log('LEVEL_TUNE', fmt(LEVEL_TUNE));
console.log('BOSS_TUNE ', fmt(BOSS_TUNE));
if (process.argv.includes('--write')) {
  let src = readFileSync(file, 'utf8');
  src = src.replace(/export const LEVEL_TUNE = (Array\(50\)\.fill\(1\)|\[[^\]]*\]);/s, `export const LEVEL_TUNE = ${fmt(LEVEL_TUNE)};`);
  src = src.replace(/export const BOSS_TUNE = (Array\(50\)\.fill\(1\)|\[[^\]]*\]);/s, `export const BOSS_TUNE = ${fmt(BOSS_TUNE)};`);
  writeFileSync(file, src);
}
