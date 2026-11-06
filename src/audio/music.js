/**
 * Look-ahead music scheduler. A setTimeout tick schedules notes slightly ahead of `ctx.currentTime`, so timing
 * comes from the audio clock and not from the (jittery) timer. Tracks are data (see tracks.js).
 * Tempo is the track's own bpm; it never follows game speed.
 */
import { parsePattern, INSTRUMENT_KINDS } from './notes.js';
import { INSTRUMENTS } from './synth.js';
import { totalSteps } from './trackSchema.js';
import { TRACKS } from './tracks.js';

export const TICK_MS = 25;
export const LOOKAHEAD = 0.1;
export const CROSSFADE = 1;

/** Compile a track into per-step event lists. */
export function compileTrack(track) {
  const steps = totalSteps(track);
  const perStep = Array.from({ length: steps }, () => []);
  for (const ch of track.channels) {
    const { events } = parsePattern(ch.pattern, INSTRUMENT_KINDS[ch.instrument]);
    for (const ev of events) perStep[ev.step].push({ instrument: ch.instrument, vol: ch.volume, ...ev });
  }
  return { steps, perStep, stepDur: 60 / track.bpm / track.stepsPerBeat };
}

export function createMusic(engine, tracks = TRACKS) {
  const compiled = new Map();
  const compile = (id) => {
    if (!compiled.has(id)) compiled.set(id, compileTrack(tracks[id]));
    return compiled.get(id);
  };
  let wanted = null; // loop track the game asked for (kept even before the context exists)
  let wantedFade = CROSSFADE;
  let current = null; // live loop instance
  const live = new Set(); // every instance still being scheduled (loop, fading out, stings)
  let timer = null;
  let lastSting = null;

  function makeInstance(id, { out, fadeIn = 0, loop = tracks[id].loop, onEnd = null }) {
    const ctx = engine.ctx;
    const c = compile(id);
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + 0.06;
    gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : 1, ctx.currentTime);
    if (fadeIn > 0) gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);
    gain.connect(out);
    const inst = { id, c, gain, loop, step: 0, nextTime: t0, onEnd, ended: false, killAt: Infinity };
    live.add(inst);
    kick();
    return inst;
  }

  function release(inst, fade) {
    const ctx = engine.ctx;
    const now = ctx.currentTime;
    inst.gain.gain.cancelScheduledValues(now);
    inst.gain.gain.setValueAtTime(Math.max(inst.gain.gain.value, 0.0001), now);
    inst.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    inst.killAt = now + fade + 0.05;
  }

  function scheduleStep(inst, t) {
    const ctx = engine.ctx;
    const { stepDur, perStep } = inst.c;
    for (const ev of perStep[inst.step]) {
      INSTRUMENTS[ev.instrument](ctx, inst.gain, t, { midis: ev.midis, dur: Math.max(0.03, ev.len * stepDur * 0.92), vol: ev.vol, accent: ev.accent });
    }
  }

  function tick() {
    timer = null;
    const ctx = engine.ctx;
    if (!ctx) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    for (const inst of [...live]) {
      if (ctx.currentTime >= inst.killAt) { live.delete(inst); inst.gain.disconnect(); continue; }
      if (inst.ended) {
        if (ctx.currentTime >= inst.endTime) { live.delete(inst); inst.gain.disconnect(); inst.onEnd?.(); }
        continue;
      }
      if (inst.killAt !== Infinity && inst.nextTime >= inst.killAt) continue;
      if (inst.nextTime < ctx.currentTime - 0.25) inst.nextTime = ctx.currentTime + 0.03; // fell behind (tab throttled): skip ahead, no burst
      while (inst.nextTime < horizon) {
        scheduleStep(inst, inst.nextTime);
        inst.nextTime += inst.c.stepDur;
        if (++inst.step >= inst.c.steps) {
          if (inst.loop) inst.step = 0;
          else { inst.ended = true; inst.endTime = inst.nextTime + 0.6; break; }
        }
      }
    }
    if (live.size) timer = setTimeout(tick, TICK_MS);
  }
  function kick() { if (timer === null) timer = setTimeout(tick, 0); }

  function start() {
    if (!engine.ctx || !wanted) return;
    if (current && current.id === wanted) return;
    const old = current;
    current = makeInstance(wanted, { out: engine.musicIn, fadeIn: old ? wantedFade : 0.4, loop: true });
    if (old) release(old, wantedFade);
  }

  return {
    /** Loop track the game currently wants ('' when stopped). Updates immediately, sound follows once unlocked. */
    get trackId() { return wanted; },
    get lastSting() { return lastSting; },
    /** Switch the background loop with a crossfade. No-op when already playing it. */
    play(id, { fade = CROSSFADE } = {}) {
      if (!tracks[id] || !tracks[id].loop) throw new Error(`not a loop track: ${id}`);
      if (id === wanted) return;
      wanted = id;
      wantedFade = fade;
      start();
    },
    /** Fade the loop out and leave silence. */
    stop({ fade = 0.5 } = {}) {
      wanted = null;
      if (current && engine.ctx) release(current, fade);
      current = null;
    },
    /** Called when the context becomes available. */
    start,
    /** One-shot track (loop: false). The loop keeps playing, ducked while the sting plays unless `duck` is 1. */
    sting(id, { duck = 0.3, onEnd = null } = {}) {
      lastSting = id;
      const ctx = engine.ctx;
      if (!ctx || !tracks[id]) { onEnd?.(); return; }
      const c = compile(id);
      const len = c.steps * c.stepDur;
      if (duck < 1) {
        engine.setDuck(duck, 0.08, 'sting');
        setTimeout(() => engine.setDuck(1, 0.6, 'sting'), (len + 0.1) * 1000);
      }
      const inst = makeInstance(id, { out: engine.musicBus, loop: false, onEnd });
      inst.sting = true;
    },
    /** Cut running stings (e.g. the player left the victory screen). */
    stopStings(fade = 0.25) {
      for (const inst of live) if (inst.sting) { inst.onEnd = null; release(inst, fade); }
    },
    get liveCount() { return live.size; },
  };
}
