import './styles/main.css';
import { loadSprites } from './render/sprites.js';
import { createRenderer } from './render/renderer.js';
import { createClock } from './core/time.js';
import { levels } from './data/levels.js';
import { snapshotStats } from './sim/stats.js';
import { createWorld, step, STEP } from './sim/world.js';
import { canPlaceTower, placeTower, startWave, upgradeTower, sellTower, setTargeting, sellValue } from './sim/commands.js';
import { createSandboxWorld, spawnTestWave } from './sim/sandbox.js';
import { getTowerDef } from './sim/towers.js';
import { createHud, REASON_TEXT } from './ui/hud.js';
import { attachInput } from './ui/input.js';
import { sellDecision, nextTargeting, nextTowerId } from './ui/hotkeys.js';
import { createScreens } from './ui/screens.js';
import { createStateMachine } from './game/state.js';
import { loadSave, writeSave, clearSave, recordClear, isLevelUnlocked, MAX_LEVEL } from './core/save.js';
import { medalFor, isBetterMedal } from './core/medals.js';
import { getUnlocksForLevel } from './data/levels.js';
import { createAudio } from './audio/index.js';
import { contractFor, contractResult } from './sim/contracts.js';

function levelFromUrl() {
  const raw = new URLSearchParams(location.search).get('level');
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && levels[n - 1] ? n : null;
}

const sandbox = new URLSearchParams(location.search).get('sandbox') === '1';

/** Fonts are inlined in the build; make sure they are decoded before the first frame (canvas text uses them too). */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 16px "Silkscreen"'), document.fonts.load('700 16px "Silkscreen"'),
      document.fonts.load('500 16px "IBM Plex Mono"'), document.fonts.load('600 16px "IBM Plex Mono"'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to the system monospace stack */ }
}

async function boot() {
  const [sprites] = await Promise.all([loadSprites(), loadFonts()]);
  const canvas = document.getElementById('game');
  const renderer = createRenderer(canvas, sprites);
  const urlLevel = levelFromUrl();
  // ?level=N and ?sandbox=1 are dev shortcuts: straight into play, bypassing the menus and locks.
  const direct = sandbox || urlLevel !== null;
  let save = loadSave();
  let levelId = urlLevel ?? 1;
  const sm = createStateMachine(direct ? 'playing' : 'start');
  const audio = createAudio(save.settings);

  const app = {
    world: null,
    armed: null,
    speed: 1,
    sandbox,
    selectedId: null,
    hover: null,
    arm(id) {
      app.armed = id && app.armed !== id ? id : null;
      if (app.armed) app.selectedId = null;
    },
    select(id) { app.selectedId = id; },
    upgrade() {
      if (app.selectedId == null) return;
      const r = upgradeTower(app.world, app.selectedId);
      if (!r.ok) { audio.play('invalid'); hud.flash(REASON_TEXT[r.reason] ?? r.reason); }
    },
    sell() {
      if (app.selectedId == null) return;
      const r = sellTower(app.world, app.selectedId);
      if (r.ok) { app.selectedId = null; hud.flash(`Sold +${r.refund}`); }
      else { audio.play('invalid'); hud.flash(REASON_TEXT[r.reason] ?? r.reason); }
    },
    setTargeting(mode) {
      if (app.selectedId != null) setTargeting(app.world, app.selectedId, mode);
    },
    escape() {
      if (sm.current === 'paused') return app.resume();
      if (sm.current === 'level-select') return goStart();
      if (sm.current !== 'playing') return;
      if (app.armed) { app.arm(null); app.select(null); return; }
      app.select(null);
      app.pause();
    },
    pause() {
      if (sm.current !== 'playing') return;
      app.armed = null;
      sm.transition('paused');
      screens.showPause(app.world, save);
    },
    resume() {
      if (sm.current !== 'paused') return;
      sm.transition('playing');
      screens.hide();
    },
    setSpeed(n) { if (n === 1 || n === 2 || n === 3) app.speed = n; },
    cycleSpeed() { app.speed = app.speed >= 3 ? 1 : app.speed + 1; },
    screen: () => sm.current,
    toggleAutoWave() {
      const on = !save.settings.autoWave;
      save.settings.autoWave = on;
      if (app.world) app.world.autoWave = on;
      writeSave(save);
      hud.setAutoWave(on);
      hud.flash(on ? 'Auto-wave on: waves start as soon as the last one is cleared' : 'Auto-wave off', 1600);
    },
    toggleMute() {
      const muted = audio.toggleMute();
      writeSave(save);
      hud.flash(muted ? 'Audio muted' : 'Audio on', 1000);
      screens.refreshAudio();
    },
    startWave() {
      const r = startWave(app.world);
      if (!r.ok) { audio.play('invalid'); hud.flash(REASON_TEXT[r.reason] ?? r.reason); }
      else if (r.bonus > 0) hud.flash(`Early call bonus +${r.bonus}`);
    },
    pendingSell: null,
    sellHotkey() {
      const t = app.world.towers.find((tw) => tw.id === app.selectedId);
      if (!t) return hud.flash('Select a tower first');
      const d = sellDecision(app.pendingSell, t.id, performance.now(), app.world.phase === 'wave');
      app.pendingSell = d.pending;
      if (d.sell) app.sell();
      else hud.flash(`Press S again to sell ${t.def.name} (+${sellValue(app.world, t)})`, 1500);
    },
    cycleTarget() {
      const t = app.world.towers.find((tw) => tw.id === app.selectedId);
      if (!t) return;
      const mode = nextTargeting(t);
      setTargeting(app.world, t.id, mode);
      hud.flash(`Targeting: ${mode}`, 1200);
    },
    handleAction(a) {
      if (a.type === 'escape') app.escape();
      else if (a.type === 'startWave') app.startWave();
      else if (a.type === 'upgrade') { if (app.selectedId == null) hud.flash('Select a tower first'); else app.upgrade(); }
      else if (a.type === 'sell') app.sellHotkey();
      else if (a.type === 'cycleTarget') app.cycleTarget();
      else if (a.type === 'selectNext') {
        const id = nextTowerId(app.world.towers, app.selectedId, a.reverse);
        if (id != null) { app.armed = null; app.selectedId = id; }
      } else if (a.type === 'speed') app.setSpeed(a.value);
      else if (a.type === 'spawnTest') app.spawnTest?.();
      else if (a.type === 'mute') app.toggleMute();
      else if (a.type === 'autoWave') app.toggleAutoWave();
    },
    spawnTest: sandbox ? () => spawnTestWave(app.world) : null,
    clickTile(tx, ty, keepArmed) {
      const w = app.world;
      if (app.armed) {
        const r = placeTower(w, app.armed, tx, ty);
        if (r.ok) {
          if (!keepArmed) app.armed = null;
        } else {
          audio.play('invalid');
          hud.flash(REASON_TEXT[r.reason] ?? r.reason);
        }
        return;
      }
      const t = w.towers.find((tw) => tw.tx === tx && tw.ty === ty);
      app.selectedId = t ? t.id : null;
    },
  };

  const hud = createHud(sprites, {
    onArm: (id) => app.arm(id),
    onStart: () => app.startWave(),
    onPause: () => app.pause(),
    onSpeed: () => app.cycleSpeed(),
    onUpgrade: () => app.upgrade(),
    onSell: () => app.sell(),
    onTargeting: (m) => app.setTargeting(m),
    onSpawnTest: () => app.spawnTest?.(),
    onMute: () => app.toggleMute(),
    onAutoWave: () => app.toggleAutoWave(),
  });
  hud.setAutoWave(save.settings.autoWave);
  audio.onChange((s) => hud.setMuted(s.muted));

  function reset(id = levelId) {
    levelId = id;
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    app.world = sandbox ? createSandboxWorld(seed) : createWorld(levelId, { seed, difficulty: save.difficulty, autoWave: save.settings.autoWave });
    app.world.autoWave = save.settings.autoWave;
    app.armed = null;
    app.selectedId = null;
    hud.buildTowerList(app.world, { sandbox });
    hud.buildBrief(app.world, { sandbox });
    if (import.meta.env.DEV) window.__td = { world: app.world, app, sm, screens, renderer, audio, get save() { return save; } };
  }

  // ---- flow ----
  function startLevel(id) {
    reset(id);
    screens.hide();
    sm.transition('playing');
  }
  function goStart() {
    sm.transition('start');
    screens.showStart(save);
  }
  function goLevelSelect() {
    sm.transition('level-select');
    screens.showLevelSelect(save);
  }
  function onWon(w) {
    const hpLost = w.stats.hpLost;
    const medal = medalFor(hpLost);
    const improved = isBetterMedal(medal, save.medals[w.level]);
    const contract = { ...contractFor(w.level), done: contractResult(w) };
    recordClear(save, w.level, medal, { contract: contract.done, difficulty: w.difficulty?.id, time: w.time, towers: snapshotStats(w).towers });
    writeSave(save);
    if (w.level >= MAX_LEVEL) {
      sm.transition('game-end');
      screens.showGameEnd({ world: w, save, medal, contract });
    } else {
      sm.transition('level-complete');
      screens.showLevelComplete({ world: w, medal, hpLost, improved, contract, nextUnlocks: getUnlocksForLevel(w.level + 1) });
    }
  }
  function onLost(w) {
    sm.transition('game-over');
    screens.showGameOver(w);
  }

  const screens = createScreens(sprites, {
    onContinue: () => startLevel(Math.min(save.unlockedLevel, MAX_LEVEL)),
    onNewCampaign: () => {
      const { difficulty, settings } = save; // difficulty and audio choices survive the reset
      save = clearSave();
      save.difficulty = difficulty;
      save.settings = settings; // same object: the audio layer holds a reference to it
      writeSave(save);
      startLevel(1);
    },
    onLevelSelect: () => goLevelSelect(),
    onStartLevel: (id) => { if (isLevelUnlocked(save, id)) startLevel(id); },
    onSetDifficulty: (id) => { save.difficulty = id; writeSave(save); },
    onResume: () => app.resume(),
    onRestart: () => startLevel(app.world.level),
    onNext: () => startLevel(Math.min(app.world.level + 1, MAX_LEVEL)),
    onToStart: () => goStart(),
    onSetAudio: (patch, commit) => {
      audio.set(patch);
      if (commit) { writeSave(save); audio.play('ui'); }
    },
    onToggleMute: () => app.toggleMute(),
  });

  reset();
  if (sm.current === 'start') screens.showStart(save);
  attachInput(canvas, app);

  // Auto-pause when the window loses focus or the tab is hidden during a level.
  const autoPause = () => { if (sm.current === 'playing') app.pause(); };
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

  const clock = createClock(STEP);
  let last = performance.now();
  function loop(now) {
    const w = app.world;
    const dtReal = (now - last) / 1000;
    last = now;
    const steps = sm.current === 'playing' ? clock.advance(dtReal, app.speed) : 0;
    for (let i = 0; i < steps; i++) step(w, STEP);

    for (const ev of w.events) {
      if (ev.type === 'waveEnd') hud.flash(`Wave cleared  +${ev.stipend + (ev.hub || 0)} coins`);
    }
    if (sm.current === 'playing') { hud.onEvents(w.events, w, app.speed); audio.consume(w.events, w); }
    if (!sandbox && sm.current === 'playing') {
      for (const ev of w.events) {
        if (ev.type !== 'levelEnd') continue;
        if (ev.result === 'won') onWon(w);
        else onLost(w);
        break;
      }
    }
    renderer.consume(w.events);
    w.events.length = 0;
    audio.update(sm.current, w);

    let ghost = null;
    if (app.armed && app.hover) {
      const { tx, ty } = app.hover;
      ghost = {
        typeId: app.armed, tx, ty,
        range: getTowerDef(app.armed).levels[0].range,
        valid: canPlaceTower(w, app.armed, tx, ty).ok,
      };
    }
    renderer.draw(w, { selectedTowerId: app.selectedId, ghost, speed: sm.current === 'playing' ? app.speed : 1 });
    hud.update(w, app);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('hud-msg').textContent = `Failed to start: ${err.message}`;
});
