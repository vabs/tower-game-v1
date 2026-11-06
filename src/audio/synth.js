/**
 * Tiny synth: oscillators, filtered noise and envelopes. Every function schedules nodes on an AudioContext at
 * absolute time `t` and lets them stop and be collected on their own. Nothing touches Web Audio at import time.
 */
import { midiToFreq } from './notes.js';

const FLOOR = 0.0001;
const caches = new WeakMap(); // ctx -> { noise, waves: Map }
const cacheOf = (ctx) => { let c = caches.get(ctx); if (!c) caches.set(ctx, c = { noise: null, waves: new Map() }); return c; };

/** One second of white noise, shared by every noise voice of a context. */
export function noiseBuffer(ctx) {
  const c = cacheOf(ctx);
  if (!c.noise) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    c.noise = buf;
  }
  return c.noise;
}

/** Band-limited pulse wave with the given duty cycle (0.5 = square). */
export function pulseWave(ctx, duty = 0.5) {
  const c = cacheOf(ctx);
  let w = c.waves.get(duty);
  if (!w) {
    const N = 32;
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) {
      const a = (2 / (n * Math.PI));
      real[n] = a * Math.sin(n * Math.PI * duty) * Math.cos(n * Math.PI * duty);
      imag[n] = a * Math.sin(n * Math.PI * duty) ** 2;
    }
    w = ctx.createPeriodicWave(real, imag);
    c.waves.set(duty, w);
  }
  return w;
}

/** Gain node with an attack/decay/sustain/release envelope over a note of length `dur`. Returns the node. */
export function envelope(ctx, out, t, dur, { peak = 1, a = 0.004, d = 0.06, s = 0.6, r = 0.05 } = {}) {
  const g = ctx.createGain();
  const att = Math.min(a, dur * 0.5);
  const dec = Math.min(d, Math.max(0.001, dur - att));
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(peak, t + att);
  g.gain.exponentialRampToValueAtTime(Math.max(peak * s, FLOOR * 2), t + att + dec);
  g.gain.setValueAtTime(Math.max(peak * s, FLOOR * 2), t + dur);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + r);
  g.connect(out);
  g.endTime = t + dur + r + 0.02;
  return g;
}

/**
 * One oscillator voice with an optional pitch glide and envelope.
 * opts: type|wave, f0, f1 (glide target), dur, vol, a, d, s, r, detune, pan(out is wrapped by caller)
 */
export function tone(ctx, out, t, { type = 'square', wave = null, f0, f1 = null, dur = 0.1, vol = 0.3, a, d, s, r, detune = 0, glide = null } = {}) {
  const env = envelope(ctx, out, t, dur, { peak: vol, a, d, s, r });
  const o = ctx.createOscillator();
  if (wave) o.setPeriodicWave(wave); else o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (glide ?? dur));
  if (detune) o.detune.value = detune;
  o.connect(env);
  o.start(t);
  o.stop(env.endTime);
  return o;
}

/** Filtered noise burst. opts: filter ('bandpass'|'highpass'|'lowpass'), f0, f1 (sweep), q, dur, vol, a, d, s, r */
export function noise(ctx, out, t, { filter = 'bandpass', f0 = 2000, f1 = null, q = 1, dur = 0.1, vol = 0.3, a = 0.002, d = 0.05, s = 0.4, r = 0.03 } = {}) {
  const env = envelope(ctx, out, t, dur, { peak: vol, a, d, s, r });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  src.connect(f);
  f.connect(env);
  src.start(t, Math.random() * 0.5);
  src.stop(env.endTime);
  return src;
}

/**
 * Instrument registry used by the music player. Each plays one step event:
 * play(ctx, out, t, { midis:number[], dur:seconds, vol:0..1, accent:boolean })
 */
export const INSTRUMENTS = {
  /** Pulse lead (25% duty), the main melody voice. */
  lead(ctx, out, t, { midis, dur, vol }) {
    for (const m of midis) tone(ctx, out, t, { wave: pulseWave(ctx, 0.25), f0: midiToFreq(m), dur, vol: vol * 0.7, a: 0.005, d: 0.09, s: 0.65, r: 0.06 });
  },
  /** Thin 12.5% pulse for arpeggios and counter lines. */
  pulse(ctx, out, t, { midis, dur, vol }) {
    for (const m of midis) tone(ctx, out, t, { wave: pulseWave(ctx, 0.125), f0: midiToFreq(m), dur: Math.min(dur, 0.22), vol: vol * 0.7, a: 0.003, d: 0.06, s: 0.4, r: 0.04 });
  },
  /** Triangle bass. */
  bass(ctx, out, t, { midis, dur, vol }) {
    for (const m of midis) tone(ctx, out, t, { type: 'triangle', f0: midiToFreq(m), dur, vol, a: 0.006, d: 0.12, s: 0.8, r: 0.05 });
  },
  /** Detuned saws through a lowpass, slow attack. Chords welcome. */
  pad(ctx, out, t, { midis, dur, vol }) {
    const env = envelope(ctx, out, t, dur, { peak: vol / Math.max(1, midis.length) * 1.6, a: Math.min(0.35, dur * 0.4), d: 0.2, s: 0.85, r: 0.5 });
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.6);
    lp.connect(env);
    for (const m of midis) {
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midiToFreq(m);
        o.detune.value = cents;
        o.connect(lp);
        o.start(t);
        o.stop(env.endTime);
      }
    }
  },
  /** Pitch-dropped sine. */
  kick(ctx, out, t, { vol, accent }) {
    tone(ctx, out, t, { type: 'sine', f0: 150, f1: 42, glide: 0.11, dur: 0.2, vol: vol * (accent ? 1.15 : 1), a: 0.001, d: 0.15, s: 0.05, r: 0.05 });
  },
  /** Noise plus a short tonal body. */
  snare(ctx, out, t, { vol, accent }) {
    const v = vol * (accent ? 1.2 : 1);
    noise(ctx, out, t, { filter: 'highpass', f0: 1800, dur: 0.14, vol: v * 0.8, d: 0.1, s: 0.1, r: 0.03 });
    tone(ctx, out, t, { type: 'triangle', f0: 200, f1: 130, dur: 0.08, vol: v * 0.5, a: 0.001, d: 0.06, s: 0.1, r: 0.02 });
  },
  /** Short (closed) or longer (accent) hat. */
  hat(ctx, out, t, { vol, accent }) {
    noise(ctx, out, t, { filter: 'highpass', f0: 7000, q: 0.7, dur: accent ? 0.1 : 0.035, vol: vol * (accent ? 0.8 : 0.6), a: 0.001, d: 0.03, s: 0.2, r: 0.02 });
  },
};
