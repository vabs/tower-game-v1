// Adjusts LEVEL_TUNE / BOSS_TUNE in src/data/waves.js so the balance bot lands near a target HP-left.
// usage: node tools/autotune.mjs [--iters 8] [--levels 2-50] [--target 0.5] [--seeds 3] [--write]
// Non-boss levels move LEVEL_TUNE; boss levels move LEVEL_TUNE and BOSS_TUNE together.
import { readFileSync, writeFileSync } from 'node:fs';
import { runBot } from './balance-bot.js';
import { levels } from '../src/data/levels.js';
import { LEVEL_TUNE, BOSS_TUNE } from '../src/data/waves.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const iters = Number(arg('iters', 8));
const [lo, hi] = String(arg('levels', '2-50')).split('-').map(Number);
const target = Number(arg('target', 0.5));
const seeds = Number(arg('seeds', 3));
const file = new URL('../src/data/waves.js', import.meta.url);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// chapter 1 is a gentle on-ramp: lower target, tighter cap
const targetFor = (l) => (l <= 10 ? Math.max(target, 0.7) : target);
const capFor = (l) => (l <= 10 ? [0.6, 2.4] : [0.35, 1.7]);

for (let it = 0; it < iters; it++) {
  let line = '';
  for (let l = lo; l <= hi; l++) {
    const boss = !!levels[l - 1].boss;
    let s = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const r = runBot(l, seed);
      s += r.won ? r.hp / r.maxHp : -(1 - Math.min(1, (r.waveReached - 1) / r.waves)) - (r.bossHpLeft > 0 ? 0.3 : 0);
    }
    s /= seeds;
    const f = 1 + 0.45 * (s - targetFor(l));
    const [a, b] = capFor(l);
    if (boss) {
      // boss levels share the correction between regular enemies and the boss
      BOSS_TUNE[l - 1] = clamp(BOSS_TUNE[l - 1] * Math.sqrt(f), 0.45, 1.6);
      LEVEL_TUNE[l - 1] = clamp(LEVEL_TUNE[l - 1] * Math.sqrt(f), a, b);
    } else LEVEL_TUNE[l - 1] = clamp(LEVEL_TUNE[l - 1] * f, a, b);
    line += `${l}:${s.toFixed(2)} `;
  }
  console.log(`iter ${it + 1}: ${line}`);
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
