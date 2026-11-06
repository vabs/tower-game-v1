// Worker for tools/sweep.mjs: runs balance-bot jobs with the tune tables the parent sends.
import { parentPort } from 'node:worker_threads';
import { runBot } from './balance-bot.js';
import { LEVEL_TUNE, BOSS_TUNE } from '../src/data/waves.js';

parentPort.on('message', ({ id, jobs, tune }) => {
  if (tune) {
    LEVEL_TUNE.splice(0, LEVEL_TUNE.length, ...tune.level);
    BOSS_TUNE.splice(0, BOSS_TUNE.length, ...tune.boss);
  }
  const out = jobs.map((j) => {
    const r = runBot(j.level, j.seed, j.opts);
    return { level: r.level, seed: r.seed, won: r.won, hp: r.hp, maxHp: r.maxHp, bossHpLeft: r.bossHpLeft, seconds: r.seconds, waveReached: r.waveReached, waves: r.waves };
  });
  parentPort.postMessage({ id, out });
});
