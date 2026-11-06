// Balance bot CLI: npm run balance [-- --levels 1-50 --seeds 3 --json]
import { runBot } from './balance-bot.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const [lo, hi] = String(arg('levels', '1-50')).split('-').map(Number);
const first = lo;
const last = hi ?? lo;
const seeds = Number(arg('seeds', 3));
const asJson = process.argv.includes('--json');

const pad = (v, n) => String(v).padStart(n);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const rows = [];
const t0 = Date.now();

if (!asJson) {
  console.log(`${pad('L', 3)} ${pad('win%', 5)} ${pad('hpLeft%', 8)} ${pad('boss left', 10)} ${pad('time s', 7)} ${pad('coins', 6)} ${pad('towers', 6)}`);
}
for (let level = first; level <= last; level++) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) runs.push(runBot(level, seed));
  const wins = runs.filter((r) => r.won);
  const lost = runs.filter((r) => !r.won);
  const row = {
    level,
    winRate: wins.length / runs.length,
    hpLeftPct: mean(runs.map((r) => (r.won ? r.hp / r.maxHp : 0))) * 100, // losses count as 0
    hpLeftWinsPct: wins.length ? mean(wins.map((r) => r.hp / r.maxHp)) * 100 : null,
    bossHpLeft: lost.length ? mean(lost.map((r) => r.bossHpLeft)) : null,
    seconds: mean(runs.map((r) => r.seconds)),
    coinsLeft: mean(runs.map((r) => r.coinsLeft)),
    towers: mean(runs.map((r) => r.towers)),
  };
  rows.push(row);
  if (!asJson) {
    console.log(
      `${pad(level, 3)} ${pad(Math.round(row.winRate * 100), 5)} ${pad(row.hpLeftWinsPct === null ? '-' : Math.round(row.hpLeftWinsPct), 8)} ${pad(row.bossHpLeft === null ? '-' : Math.round(row.bossHpLeft), 10)} ${pad(Math.round(row.seconds), 7)} ${pad(Math.round(row.coinsLeft), 6)} ${pad(row.towers.toFixed(1), 6)}`
    );
  }
}

const chapters = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50]];
if (asJson) {
  console.log(JSON.stringify(rows));
} else {
  console.log('\nchapter     win%  hpLeft%(wins)  avg time s');
  for (const [a, b] of chapters) {
    const rs = rows.filter((r) => r.level >= a && r.level <= b);
    if (!rs.length) continue;
    const hp = rs.filter((r) => r.hpLeftWinsPct !== null);
    console.log(
      `L${pad(a, 2)}-${pad(b, 2)}   ${pad(Math.round(mean(rs.map((r) => r.winRate)) * 100), 6)}  ${pad(hp.length ? Math.round(mean(hp.map((r) => r.hpLeftWinsPct))) : '-', 12)}  ${pad(Math.round(mean(rs.map((r) => r.seconds))), 9)}`
    );
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s wall`);
}
