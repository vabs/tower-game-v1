// Balance bot CLI:
//   npm run balance [-- --levels 1-50 --seeds 3 --profile greedy|human --difficulty recruit|regular|veteran --seed0 1 --json]
// greedy = the strong bot (mid-wave actions, best placements, tuned targeting); human = the human proxy
// (build-phase purchases only, ~70% placements, "first" targeting). Deterministic per seed.
import { runBot, HUMAN_PROFILE } from './balance-bot.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const [lo, hi] = String(arg('levels', '1-50')).split('-').map(Number);
const first = lo;
const last = hi ?? lo;
const profile = arg('profile', 'greedy');
if (!['greedy', 'human'].includes(profile)) throw new Error(`unknown --profile ${profile}`);
const difficulty = arg('difficulty', 'regular');
const seeds = Number(arg('seeds', profile === 'human' ? 10 : 3));
const seed0 = Number(arg('seed0', 1)); // first seed (use e.g. --seed0 101 to validate on unseen seeds)
const asJson = process.argv.includes('--json');
const opts = { ...(profile === 'human' ? HUMAN_PROFILE : {}), difficulty };

const pad = (v, n) => String(v).padStart(n);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
/** p-th percentile (nearest rank, p in 0..1) of a list. */
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
const rows = [];
const t0 = Date.now();

if (!asJson) {
  console.log(`profile ${profile}, difficulty ${difficulty}, ${seeds} seeds`);
  console.log(
    profile === 'human'
      ? `${pad('L', 3)} ${pad('win%', 5)} ${pad('p10 hp%', 8)} ${pad('mean hp%', 9)} ${pad('boss left', 10)} ${pad('time s', 7)}`
      : `${pad('L', 3)} ${pad('win%', 5)} ${pad('hpLeft%', 8)} ${pad('boss left', 10)} ${pad('time s', 7)} ${pad('w/ cd s', 8)} ${pad('coins', 6)} ${pad('towers', 6)}`
  );
}
for (let level = first; level <= last; level++) {
  const runs = [];
  for (let seed = seed0; seed < seed0 + seeds; seed++) runs.push(runBot(level, seed, opts));
  const wins = runs.filter((r) => r.won);
  const lost = runs.filter((r) => !r.won);
  const hpAll = runs.map((r) => (r.won ? r.hp / r.maxHp : 0) * 100); // losses count as 0
  const row = {
    level,
    winRate: wins.length / runs.length,
    hpLeftPct: mean(hpAll),
    hpP10Pct: pct(hpAll, 0.1),
    hpLeftWinsPct: wins.length ? mean(wins.map((r) => r.hp / r.maxHp)) * 100 : null,
    bossHpLeft: lost.length ? mean(lost.map((r) => r.bossHpLeft)) : null,
    seconds: mean(runs.map((r) => r.seconds)),
    fullSeconds: mean(runs.map((r) => r.fullSeconds)),
    coinsLeft: mean(runs.map((r) => r.coinsLeft)),
    towers: mean(runs.map((r) => r.towers)),
  };
  rows.push(row);
  if (!asJson) {
    const common = `${pad(level, 3)} ${pad(Math.round(row.winRate * 100), 5)}`;
    const boss = pad(row.bossHpLeft === null ? '-' : Math.round(row.bossHpLeft), 10);
    if (profile === 'human') {
      console.log(`${common} ${pad(Math.round(row.hpP10Pct), 8)} ${pad(Math.round(row.hpLeftPct), 9)} ${boss} ${pad(Math.round(row.seconds), 7)}`);
    } else {
      console.log(`${common} ${pad(row.hpLeftWinsPct === null ? '-' : Math.round(row.hpLeftWinsPct), 8)} ${boss} ${pad(Math.round(row.seconds), 7)} ${pad(Math.round(row.fullSeconds), 8)} ${pad(Math.round(row.coinsLeft), 6)} ${pad(row.towers.toFixed(1), 6)}`);
    }
  }
}

const chapters = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50]];
if (asJson) {
  console.log(JSON.stringify(rows));
} else {
  console.log(profile === 'human' ? '\nchapter     win%  p10 hp%  mean hp%  avg time s' : '\nchapter     win%  hpLeft%(wins)  avg time s  w/ countdowns s');
  for (const [a, b] of chapters) {
    const rs = rows.filter((r) => r.level >= a && r.level <= b);
    if (!rs.length) continue;
    if (profile === 'human') {
      console.log(`L${pad(a, 2)}-${pad(b, 2)}   ${pad(Math.round(mean(rs.map((r) => r.winRate)) * 100), 6)}  ${pad(Math.round(mean(rs.map((r) => r.hpP10Pct))), 7)}  ${pad(Math.round(mean(rs.map((r) => r.hpLeftPct))), 8)}  ${pad(Math.round(mean(rs.map((r) => r.seconds))), 10)}`);
      continue;
    }
    const hp = rs.filter((r) => r.hpLeftWinsPct !== null);
    console.log(
      `L${pad(a, 2)}-${pad(b, 2)}   ${pad(Math.round(mean(rs.map((r) => r.winRate)) * 100), 6)}  ${pad(hp.length ? Math.round(mean(hp.map((r) => r.hpLeftWinsPct))) : '-', 12)}  ${pad(Math.round(mean(rs.map((r) => r.seconds))), 9)}  ${pad(Math.round(mean(rs.map((r) => r.fullSeconds))), 16)}`
    );
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s wall`);
}
