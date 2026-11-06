import { test, expect } from 'vitest';
import { mapEvent, SOUNDS } from '../../src/audio/sfx.js';
import { volumeToGain } from '../../src/audio/engine.js';

const names = (ev) => mapEvent(ev).map((s) => s.name);

test('tower families map to distinct firing sounds', () => {
  const fire = (family, kind = 'shot') => names({ type: 'fire', family, kind, x: 100 });
  expect(fire('assault')).toEqual(['fireAssault']);
  expect(fire('precision', 'rail')).toEqual(['firePrecision']);
  expect(fire('explosive', 'splash')).toEqual(['fireExplosive']);
  expect(fire('control')).toEqual(['controlShot']);
  expect(fire('control', 'gas')).toEqual(['hiss']);
  expect(fire('control', 'chain')).toEqual([]); // the chain event carries the zap
  expect(fire('support')).toEqual(['blip']);
  expect(fire('anti-air')).toEqual(['fireAA']);
});

test('other events', () => {
  expect(names({ type: 'splash', x: 1, y: 1, radius: 40 })).toEqual(['explosion']);
  expect(names({ type: 'chain', points: [{ x: 5, y: 5 }] })).toEqual(['zap']);
  expect(names({ type: 'kill', defId: 'grunt', coins: 3 })).toEqual(['kill', 'coin']);
  expect(names({ type: 'kill', defId: 'tank_boss', coins: 50 })).toEqual(['explosion', 'coin']);
  expect(names({ type: 'leak' })).toEqual(['leak']);
  for (const t of ['place', 'upgrade', 'sell', 'supplyDrop']) expect(names({ type: t })).toEqual([t]);
  expect(names({ type: 'bossPhase', phase: 'enrage' })).toEqual(['bossPhase']);
  expect(names({ type: 'hit' })).toEqual([]);
  expect(names({ type: 'levelEnd' })).toEqual([]);
});

test('every mapped sound exists in the table, with sane limits', () => {
  const evs = [{ type: 'fire', kind: 'shot' }, { type: 'splash' }, { type: 'chain' }, { type: 'kill', coins: 1 }, { type: 'leak' }, { type: 'place' }, { type: 'upgrade' }, { type: 'sell' }, { type: 'supplyDrop' }, { type: 'bossPhase' }, { type: 'waveEnd' }];
  for (const family of ['assault', 'precision', 'explosive', 'control', 'support', 'anti-air']) evs.push({ type: 'fire', family, kind: 'shot' }, { type: 'fire', family, kind: 'gas' });
  for (const ev of evs) for (const s of mapEvent(ev)) expect(SOUNDS[s.name], s.name).toBeDefined();
  for (const name of ['ui', 'invalid']) expect(SOUNDS[name]).toBeDefined();
  for (const [name, d] of Object.entries(SOUNDS)) {
    expect(d.max, name).toBeGreaterThanOrEqual(1);
    expect(d.gap, name).toBeGreaterThanOrEqual(0.03);
    expect(d.dur, name).toBeGreaterThan(0);
  }
});

test('volume taper', () => {
  expect(volumeToGain(0)).toBe(0);
  expect(volumeToGain(1)).toBe(1);
  expect(volumeToGain(0.5)).toBe(0.25);
  expect(volumeToGain(5)).toBe(1);
  expect(volumeToGain(-1)).toBe(0);
});

import { createWorld, step, STEP } from '../../src/sim/world.js';
import { placeTower } from '../../src/sim/commands.js';
import { spawnEnemy } from '../../src/sim/enemies.js';

test('the sim emits a fire event (family + kind) when a tower shoots', () => {
  const w = createWorld(1);
  placeTower(w, 'ar_turret', 6, 3);
  spawnEnemy(w, 'grunt');
  for (let i = 0; i < 600 && !w.events.some((e) => e.type === 'fire'); i++) step(w, STEP);
  const ev = w.events.find((e) => e.type === 'fire');
  expect(ev).toMatchObject({ typeId: 'ar_turret', family: 'assault', kind: 'shot' });
  expect(mapEvent(ev).map((s) => s.name)).toEqual(['fireAssault']);
});
