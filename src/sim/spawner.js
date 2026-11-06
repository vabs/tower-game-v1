import { GROUP_GAP } from '../data/waves.js';
import { stipendForLevel } from '../systems/economy.js';
import { spawnEnemy } from './enemies.js';

/** Flatten a wave into a time-ordered spawn queue (seconds from wave start). */
export function buildSpawnQueue(wave) {
  const queue = [];
  let t = 0;
  for (const g of wave.enemies) {
    for (let i = 0; i < g.count; i++) {
      queue.push({ t, id: g.id });
      t += g.interval;
    }
    t += GROUP_GAP - g.interval;
  }
  return queue;
}

export function beginWave(world) {
  world.phase = 'wave';
  world.countdown = null;
  world.spawner = { queue: buildSpawnQueue(world.waves[world.waveIndex]), next: 0, elapsed: 0 };
  world.events.push({ type: 'waveStart', wave: world.waveIndex });
  const wave = world.waves[world.waveIndex];
  if (wave.supply) {
    world.coins += wave.coins;
    world.events.push({ type: 'supplyDrop', wave: world.waveIndex, coins: wave.coins });
  }
}

/** Spawn due enemies; finish the wave when everything is spawned and dead/leaked. */
export function updateSpawner(world, dt) {
  if (world.phase === 'build') {
    if (world.countdown !== null) {
      world.countdown -= dt;
      if (world.countdown <= 0) beginWave(world);
    }
    return;
  }
  if (world.phase !== 'wave') return;
  const sp = world.spawner;
  sp.elapsed += dt;
  while (sp.next < sp.queue.length && sp.queue[sp.next].t <= sp.elapsed) {
    spawnEnemy(world, sp.queue[sp.next].id);
    sp.next++;
  }
  if (sp.next >= sp.queue.length && world.enemies.length === 0 && world.hp > 0) endWave(world);
}

function endWave(world) {
  // Supply Drop waves pay their flat coins at start instead of stipend/hub income.
  const supply = !!world.waves[world.waveIndex].supply;
  const stipend = supply ? 0 : stipendForLevel(world.level);
  let hub = 0;
  if (!supply) for (const t of world.towers) hub += t.def.levels[t.level - 1].endWaveCoins ?? 0; // Logistics Hub
  world.coins += stipend + hub;
  world.events.push({ type: 'waveEnd', wave: world.waveIndex, stipend, hub });
  world.waveIndex++;
  world.spawner = null;
  if (world.waveIndex >= world.waves.length) {
    world.phase = 'won';
    world.events.push({ type: 'levelEnd', result: 'won' });
  } else {
    world.phase = 'build';
    world.countdown = world.countdownLength;
  }
}
