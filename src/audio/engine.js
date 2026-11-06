/**
 * Owns the single AudioContext and the master graph:
 *   music -> duck -> musicBus -> master -> compressor -> destination
 *   sfx   ---------> sfxBus   -> master
 * The context is created lazily on a user gesture (browsers block autoplay).
 */

/** Volume slider (0..1) to linear gain: a squared taper feels linear to the ear. */
export const volumeToGain = (v) => Math.min(1, Math.max(0, v)) ** 2;

const MUSIC_TRIM = 0.7;
const MUTE_RAMP = 0.03;

export function createEngine({ AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let ctx = null;
  let nodes = null;
  const settings = { music: 0.6, sfx: 0.8, muted: false };
  const duckLayers = { pause: 1, sting: 1 };
  const duckProduct = () => duckLayers.pause * duckLayers.sting;
  const readyCbs = [];

  function ramp(param, value, seconds) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  const applyMaster = () => { if (nodes) ramp(nodes.master.gain, settings.muted ? 0 : 1, MUTE_RAMP); };
  const applyMusic = () => { if (nodes) ramp(nodes.musicBus.gain, volumeToGain(settings.music) * MUSIC_TRIM, 0.05); };
  const applySfx = () => { if (nodes) ramp(nodes.sfxBus.gain, volumeToGain(settings.sfx), 0.05); };

  function build() {
    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(ctx.destination);
    const musicBus = ctx.createGain();
    const duckNode = ctx.createGain();
    const sfxBus = ctx.createGain();
    duckNode.connect(musicBus);
    musicBus.connect(master);
    sfxBus.connect(master);
    master.gain.value = settings.muted ? 0 : 1;
    musicBus.gain.value = volumeToGain(settings.music) * MUSIC_TRIM;
    sfxBus.gain.value = volumeToGain(settings.sfx);
    duckNode.gain.value = duckProduct();
    nodes = { master, comp, musicBus, duckNode, sfxBus };
  }

  const engine = {
    get ctx() { return ctx; },
    get musicIn() { return nodes?.duckNode ?? null; },
    /** Music that must not be ducked (stings). */
    get musicBus() { return nodes?.musicBus ?? null; },
    get sfxIn() { return nodes?.sfxBus ?? null; },
    get settings() { return settings; },
    get supported() { return !!AudioContextCtor; },

    /** Create the context if needed (call from a user gesture). Returns it, or null when unsupported. */
    ensure() {
      if (ctx) return ctx;
      if (!AudioContextCtor) return null;
      try {
        ctx = new AudioContextCtor({ latencyHint: 'interactive' });
      } catch {
        return null;
      }
      build();
      for (const cb of readyCbs.splice(0)) cb(ctx);
      return ctx;
    },
    onReady(cb) { if (ctx) cb(ctx); else readyCbs.push(cb); },
    async resume() { try { if (ctx && ctx.state !== 'running') await ctx.resume(); } catch { /* needs a gesture */ } },
    async suspend() { try { if (ctx && ctx.state === 'running') await ctx.suspend(); } catch { /* ignore */ } },

    setMusicVolume(v) { settings.music = Math.min(1, Math.max(0, v)); applyMusic(); },
    setSfxVolume(v) { settings.sfx = Math.min(1, Math.max(0, v)); applySfx(); },
    setMuted(m) { settings.muted = !!m; applyMaster(); },
    /** Lower (or restore) the music: `level` 1 = untouched. Independent layers: 'pause' and 'sting'. */
    setDuck(level, seconds = 0.25, layer = 'pause') {
      duckLayers[layer] = level;
      if (nodes) ramp(nodes.duckNode.gain, duckProduct(), seconds);
    },
    get duckLevel() { return duckProduct(); },
    state: () => (ctx ? ctx.state : 'none'),
    masterGain: () => (nodes ? nodes.master.gain.value : null),
  };
  return engine;
}
