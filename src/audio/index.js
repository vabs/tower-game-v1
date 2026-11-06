/**
 * Audio controller for the app layer: owns the engine, music and sfx, unlocks audio on the first user gesture,
 * follows the game state (screen + world) and consumes sim events. The sim never imports from here.
 */
import { createEngine } from './engine.js';
import { createMusic } from './music.js';
import { createSfx } from './sfx.js';
import { musicPlan } from './musicState.js';

export function createAudio(settings) {
  const engine = createEngine();
  const music = createMusic(engine);
  const sfx = createSfx(engine);
  const listeners = new Set();
  let screen = null;
  let planKey = '';
  let lastDuck = false;

  const apply = (s = settings) => {
    engine.setMusicVolume(s.music);
    engine.setSfxVolume(s.sfx);
    engine.setMuted(s.muted);
    for (const cb of listeners) cb(s);
  };
  apply();
  engine.onReady(() => music.start());

  // Browsers block audio until a gesture: create / resume the context from the first one.
  const unlock = () => {
    if (document.hidden) return;
    if (!engine.ensure()) return;
    if (engine.state() !== 'running') engine.resume();
  };
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'touchend']) window.addEventListener(type, unlock, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.suspend(); else engine.resume(); });
  // Button clicks anywhere (HUD, menus) get the UI tick; the mute button is silent.
  document.addEventListener('click', (e) => {
    const b = e.target?.closest?.('button');
    if (b && b.id !== 'hud-mute' && !b.disabled) sfx.play('ui');
  }, { capture: true });

  function followState(nextScreen, world) {
    const plan = musicPlan(nextScreen, world);
    const key = `${nextScreen}|${plan.track}|${plan.hold ? 'h' : ''}|${plan.sting ?? ''}`;
    if (nextScreen !== screen) {
      const leavingSting = screen === 'level-complete' || screen === 'game-over' || screen === 'game-end';
      if (leavingSting && !plan.sting) music.stopStings(0.25);
    }
    screen = nextScreen;
    if (plan.duck !== lastDuck) { lastDuck = plan.duck; engine.setDuck(plan.duck ? 0.35 : 1, 0.25, 'pause'); }
    if (key === planKey) return;
    planKey = key;
    if (plan.sting) {
      music.stop({ fade: 0.4 });
      music.sting(plan.sting, { duck: 1, onEnd: () => { if (planKey === key && plan.then) music.play(plan.then, { fade: 1 }); } });
    } else if (plan.track) {
      music.play(plan.track);
    }
  }

  return {
    engine, music, sfx,
    settings: () => settings,
    /** Apply the (mutated) settings object, or a patch merged into it. */
    set(patch) { Object.assign(settings, patch); apply(); },
    toggleMute() { settings.muted = !settings.muted; apply(); return settings.muted; },
    onChange(cb) { listeners.add(cb); cb(settings); },
    play: (name, opts) => sfx.play(name, opts),
    /** Called every frame: pick the music for the current game state and fire stings on entry. */
    update(nextScreen, world) { followState(nextScreen, world); },
    /** Sim events of this frame (waveStart / bossAlert stings and all sound effects). */
    consume(events, world) {
      sfx.consume(events);
      for (const ev of events) {
        if (ev.type !== 'waveStart') continue;
        const boss = world.waves?.[ev.wave]?.enemies?.some((g) => g.id.endsWith('_boss'));
        music.sting(boss ? 'bossAlert' : 'waveStart', { duck: 0.35 });
      }
    },
    /** Inspection hook for tests (window.__td.audio in dev builds). */
    debug: () => ({
      state: engine.state(), master: engine.masterGain(), muted: settings.muted,
      musicVolume: settings.music, sfxVolume: settings.sfx,
      track: music.trackId, sting: music.lastSting, duck: engine.duckLevel, sfx: sfx.stats(),
    }),
  };
}
