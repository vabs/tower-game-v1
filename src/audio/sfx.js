/**
 * Sound effects: sim/UI events -> named sounds (pure `mapEvent`), and the synthesized sounds themselves.
 * Every sound passes through a voice limiter (per-sound cap, retrigger interval, global cap) so a busy wave stays
 * readable and never clips. Sounds do not depend on game speed: faster play simply delivers more events.
 */
import { tone, noise, pulseWave } from './synth.js';
import { createVoiceLimiter } from './limiter.js';

const BOSS_SUFFIX = '_boss';

/**
 * Map one sim event to the sounds it should trigger.
 * @returns {{name:string, x?:number}[]}
 */
export function mapEvent(ev) {
  switch (ev.type) {
    case 'fire': {
      if (ev.kind === 'chain') return []; // the 'chain' event carries the zap
      switch (ev.family) {
        case 'assault': return [{ name: 'fireAssault', x: ev.x }];
        case 'precision': return [{ name: 'firePrecision', x: ev.x }];
        case 'explosive': return [{ name: 'fireExplosive', x: ev.x }];
        case 'control': return [{ name: ev.kind === 'gas' ? 'hiss' : 'controlShot', x: ev.x }];
        case 'support': return [{ name: 'blip', x: ev.x }];
        case 'anti-air': return [{ name: 'fireAA', x: ev.x }];
        default: return [];
      }
    }
    case 'splash': return [{ name: 'explosion', x: ev.x }];
    case 'chain': return [{ name: 'zap', x: ev.points?.[0]?.x }];
    case 'kill': {
      const boss = typeof ev.defId === 'string' && ev.defId.endsWith(BOSS_SUFFIX);
      return [{ name: boss ? 'explosion' : 'kill', x: ev.x }, ...(ev.coins > 0 ? [{ name: 'coin', x: ev.x }] : [])];
    }
    case 'leak': return [{ name: 'leak' }];
    case 'place': return [{ name: 'place' }];
    case 'upgrade': return [{ name: 'upgrade' }];
    case 'sell': return [{ name: 'sell' }];
    case 'supplyDrop': return [{ name: 'supplyDrop' }];
    case 'bossPhase': return [{ name: 'bossPhase' }];
    case 'waveEnd': return [{ name: 'coin' }];
    default: return [];
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);
/** Random pitch factor around 1 (+-pct). */
const wob = (pct) => 1 + (Math.random() * 2 - 1) * pct;

/**
 * Sound table. fn(ctx, out, t) builds the voice; `dur` is how long it keeps a voice slot busy; `max` and `gap`
 * are the per-sound voice cap and minimum retrigger interval (seconds); `priority` ignores the global cap.
 */
export const SOUNDS = {
  ui: { dur: 0.05, max: 2, gap: 0.03, fn: (c, o, t) => tone(c, o, t, { type: 'square', f0: 1100, f1: 700, dur: 0.03, vol: 0.22, a: 0.001 }) },
  fireAssault: {
    dur: 0.06, max: 3, gap: 0.055,
    fn: (c, o, t) => {
      noise(c, o, t, { filter: 'bandpass', f0: 2600 * wob(0.1), q: 1.2, dur: 0.04, vol: 0.28, d: 0.03 });
      tone(c, o, t, { type: 'square', f0: 900 * wob(0.06), f1: 450, dur: 0.035, vol: 0.12, a: 0.001 });
    },
  },
  firePrecision: {
    dur: 0.1, max: 3, gap: 0.07,
    fn: (c, o, t) => {
      noise(c, o, t, { filter: 'highpass', f0: 3200, dur: 0.07, vol: 0.3, d: 0.05, s: 0.1 });
      tone(c, o, t, { type: 'sawtooth', f0: 2000 * wob(0.05), f1: 220, dur: 0.1, vol: 0.18, a: 0.001, d: 0.08, s: 0.1 });
    },
  },
  fireExplosive: {
    dur: 0.18, max: 2, gap: 0.09,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sine', f0: 150 * wob(0.08), f1: 48, dur: 0.16, vol: 0.5, a: 0.002, d: 0.12, s: 0.1 });
      noise(c, o, t, { filter: 'lowpass', f0: 900, f1: 200, dur: 0.1, vol: 0.2 });
    },
  },
  explosion: {
    dur: 0.4, max: 3, gap: 0.07,
    fn: (c, o, t) => {
      noise(c, o, t, { filter: 'lowpass', f0: 1400, f1: 150, dur: 0.36, vol: 0.42, d: 0.25, s: 0.15, r: 0.08 });
      tone(c, o, t, { type: 'sine', f0: 95, f1: 32, dur: 0.32, vol: 0.5, a: 0.002, d: 0.25, s: 0.1 });
    },
  },
  controlShot: {
    dur: 0.14, max: 3, gap: 0.08,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sawtooth', f0: 1500 * wob(0.08), f1: 380, dur: 0.12, vol: 0.14, a: 0.002, d: 0.1, s: 0.1 });
      noise(c, o, t, { filter: 'highpass', f0: 5000, dur: 0.1, vol: 0.12 });
    },
  },
  zap: {
    dur: 0.2, max: 3, gap: 0.09,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sawtooth', f0: 2400, f1: 180, dur: 0.15, vol: 0.2, a: 0.001, d: 0.12, s: 0.2 });
      tone(c, o, t + 0.02, { type: 'square', f0: 1700, f1: 300, dur: 0.1, vol: 0.1, a: 0.001 });
      noise(c, o, t, { filter: 'bandpass', f0: 4200, q: 0.8, dur: 0.08, vol: 0.18 });
    },
  },
  hiss: {
    dur: 0.3, max: 2, gap: 0.14,
    fn: (c, o, t) => noise(c, o, t, { filter: 'highpass', f0: 4500, f1: 7500, dur: 0.26, vol: 0.14, a: 0.04, d: 0.1, s: 0.5, r: 0.08 }),
  },
  blip: { dur: 0.1, max: 2, gap: 0.12, fn: (c, o, t) => tone(c, o, t, { type: 'sine', f0: 880 * wob(0.03), f1: 1180, dur: 0.07, vol: 0.18, a: 0.004 }) },
  fireAA: {
    dur: 0.06, max: 4, gap: 0.045,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sine', f0: 520 * wob(0.1), f1: 190, dur: 0.045, vol: 0.28, a: 0.001, d: 0.04, s: 0.1 });
      noise(c, o, t, { filter: 'bandpass', f0: 1600, dur: 0.025, vol: 0.14 });
    },
  },
  kill: {
    dur: 0.09, max: 4, gap: 0.045,
    fn: (c, o, t) => {
      noise(c, o, t, { filter: 'bandpass', f0: 1100 * wob(0.2), q: 0.8, dur: 0.06, vol: 0.16 });
      tone(c, o, t, { type: 'triangle', f0: 320 * wob(0.1), f1: 110, dur: 0.07, vol: 0.2, a: 0.001 });
    },
  },
  coin: {
    dur: 0.2, max: 3, gap: 0.11,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'triangle', f0: 988, dur: 0.07, vol: 0.2, a: 0.002, s: 0.5 });
      tone(c, o, t + 0.06, { type: 'triangle', f0: 1319, dur: 0.12, vol: 0.2, a: 0.002, s: 0.4, r: 0.08 });
    },
  },
  leak: {
    dur: 0.5, max: 1, gap: 0.3, priority: true,
    fn: (c, o, t) => {
      for (let i = 0; i < 3; i++) {
        tone(c, o, t + i * 0.14, { type: 'square', f0: i % 2 ? 165 : 220, dur: 0.11, vol: 0.26, a: 0.003, s: 0.8, r: 0.02 });
      }
    },
  },
  place: {
    dur: 0.15, max: 2, gap: 0.08, priority: true,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'triangle', f0: 240, f1: 100, dur: 0.1, vol: 0.4, a: 0.001, d: 0.08, s: 0.1 });
      noise(c, o, t, { filter: 'bandpass', f0: 1800, dur: 0.03, vol: 0.2 });
    },
  },
  upgrade: {
    dur: 0.3, max: 2, gap: 0.12, priority: true,
    fn: (c, o, t) => {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(c, o, t + i * 0.06, { wave: pulseWave(c, 0.25), f0: f, dur: 0.07, vol: 0.18, a: 0.002, s: 0.6, r: 0.05 }));
    },
  },
  sell: {
    dur: 0.3, max: 2, gap: 0.12, priority: true,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'square', f0: 880, f1: 600, dur: 0.07, vol: 0.14, a: 0.002 });
      tone(c, o, t + 0.07, { type: 'square', f0: 660, f1: 390, dur: 0.1, vol: 0.14, a: 0.002 });
      noise(c, o, t + 0.12, { filter: 'highpass', f0: 6000, dur: 0.08, vol: 0.1 });
    },
  },
  invalid: {
    dur: 0.2, max: 1, gap: 0.15, priority: true,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sawtooth', f0: 110, dur: 0.16, vol: 0.28, a: 0.002, s: 0.9, r: 0.02 });
      tone(c, o, t, { type: 'square', f0: 98, dur: 0.16, vol: 0.18, a: 0.002, s: 0.9, r: 0.02 });
    },
  },
  supplyDrop: {
    dur: 0.8, max: 1, gap: 0.5, priority: true,
    fn: (c, o, t) => {
      noise(c, o, t, { filter: 'bandpass', f0: 500, f1: 3500, q: 0.9, dur: 0.45, vol: 0.2, a: 0.15, d: 0.2, s: 0.6, r: 0.1 });
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(c, o, t + 0.35 + i * 0.07, { type: 'triangle', f0: f, dur: 0.1, vol: 0.2, a: 0.002, s: 0.5, r: 0.08 }));
    },
  },
  bossPhase: {
    dur: 0.9, max: 1, gap: 0.6, priority: true,
    fn: (c, o, t) => {
      tone(c, o, t, { type: 'sawtooth', f0: 110, f1: 98, dur: 0.7, vol: 0.28, a: 0.03, s: 0.8, r: 0.15 });
      tone(c, o, t, { type: 'sawtooth', f0: 116, f1: 104, dur: 0.7, vol: 0.2, a: 0.03, s: 0.8, r: 0.15 });
      noise(c, o, t, { filter: 'lowpass', f0: 600, dur: 0.3, vol: 0.25 });
    },
  },
};

export const SOUND_NAMES = Object.keys(SOUNDS);

const limiterConfig = () => ({
  globalMax: 24,
  perSound: Object.fromEntries(Object.entries(SOUNDS).map(([k, v]) => [k, { max: v.max, minInterval: v.gap, priority: !!v.priority }])),
});

export function createSfx(engine) {
  const limiter = createVoiceLimiter(limiterConfig());
  let played = 0;
  let dropped = 0;
  let last = null;

  /** @param {string} name  @param {{x?:number}} [opts] x = world x in 0..960 for stereo placement */
  function play(name, { x } = {}) {
    const ctx = engine.ctx;
    const def = SOUNDS[name];
    if (!ctx || !def || ctx.state !== 'running' || engine.settings.muted || engine.settings.sfx <= 0) return false;
    const t = ctx.currentTime + 0.005;
    if (!limiter.tryAcquire(name, t, def.dur)) { dropped++; return false; }
    let out = engine.sfxIn;
    if (x != null && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-0.7, Math.min(0.7, (x / 960) * 1.4 - 0.7));
      pan.connect(out);
      out = pan;
    }
    def.fn(ctx, out, t);
    played++;
    last = name;
    return true;
  }

  return {
    play,
    /** Play every sound the events map to. */
    consume(events) { for (const ev of events) for (const s of mapEvent(ev)) play(s.name, s); },
    stats: () => ({ played, dropped, last, active: engine.ctx ? limiter.active(engine.ctx.currentTime) : 0 }),
  };
}
