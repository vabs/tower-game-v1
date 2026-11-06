import './styles/main.css';
import { loadSprites } from './render/sprites.js';
import { createRenderer } from './render/renderer.js';
import { createClock } from './core/time.js';
import { levels } from './data/levels.js';
import { snapshotStats } from './sim/stats.js';
import { createWorld, step, STEP } from './sim/world.js';
import { canPlaceTower, placeTower, startWave, upgradeTower, sellTower, setTargeting } from './sim/commands.js';
import { createSandboxWorld, spawnTestWave } from './sim/sandbox.js';
import { getTowerDef } from './sim/towers.js';
import { createHud, REASON_TEXT } from './ui/hud.js';
import { attachInput } from './ui/input.js';
import { createScreens } from './ui/screens.js';
import { createStateMachine } from './game/state.js';
import { loadSave, writeSave, clearSave, recordClear, isLevelUnlocked, MAX_LEVEL } from './core/save.js';
import { medalFor, isBetterMedal } from './core/medals.js';
import { getUnlocksForLevel } from './data/levels.js';

function levelFromUrl() {
  const raw = new URLSearchParams(location.search).get('level');
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && levels[n - 1] ? n : null;
}

const sandbox = new URLSearchParams(location.search).get('sandbox') === '1';

async function boot() {
  const sprites = await loadSprites();
  const canvas = document.getElementById('game');
  const renderer = createRenderer(canvas, sprites);
  const urlLevel = levelFromUrl();
  // ?level=N and ?sandbox=1 are dev shortcuts: straight into play, bypassing the menus and locks.
  const direct = sandbox || urlLevel !== null;
  let save = loadSave();
  let levelId = urlLevel ?? 1;
  const sm = createStateMachine(direct ? 'playing' : 'start');

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
      if (!r.ok) hud.flash(REASON_TEXT[r.reason] ?? r.reason);
    },
    sell() {
      if (app.selectedId == null) return;
      const r = sellTower(app.world, app.selectedId);
      if (r.ok) { app.selectedId = null; hud.flash(`Sold +${r.refund}`); }
      else hud.flash(REASON_TEXT[r.reason] ?? r.reason);
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
      screens.showPause(app.world);
    },
    resume() {
      if (sm.current !== 'paused') return;
      sm.transition('playing');
      screens.hide();
    },
    setSpeed(n) { if (n === 1 || n === 2 || n === 3) app.speed = n; },
    cycleSpeed() { app.speed = app.speed >= 3 ? 1 : app.speed + 1; },
    spawnTest: sandbox ? () => spawnTestWave(app.world) : null,
    clickTile(tx, ty, keepArmed) {
      const w = app.world;
      if (app.armed) {
        const r = placeTower(w, app.armed, tx, ty);
        if (r.ok) {
          if (!keepArmed) app.armed = null;
        } else {
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
    onStart: () => {
      const r = startWave(app.world);
      if (!r.ok) hud.flash(REASON_TEXT[r.reason] ?? r.reason);
      else if (r.bonus > 0) hud.flash(`Early call bonus +${r.bonus}`);
    },
    onPause: () => app.pause(),
    onSpeed: () => app.cycleSpeed(),
    onUpgrade: () => app.upgrade(),
    onSell: () => app.sell(),
    onTargeting: (m) => app.setTargeting(m),
    onSpawnTest: () => app.spawnTest?.(),
  });

  function reset(id = levelId) {
    levelId = id;
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    app.world = sandbox ? createSandboxWorld(seed) : createWorld(levelId, { seed });
    app.armed = null;
    app.selectedId = null;
    hud.buildTowerList(app.world, { sandbox });
    hud.buildBrief(app.world, { sandbox });
    if (import.meta.env.DEV) window.__td = { world: app.world, app, sm, screens, renderer, get save() { return save; } };
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
    recordClear(save, w.level, medal, { time: w.time, towers: snapshotStats(w).towers });
    writeSave(save);
    if (w.level >= MAX_LEVEL) {
      sm.transition('game-end');
      screens.showGameEnd({ world: w, save, medal });
    } else {
      sm.transition('level-complete');
      screens.showLevelComplete({ world: w, medal, hpLost, improved, nextUnlocks: getUnlocksForLevel(w.level + 1) });
    }
  }
  function onLost(w) {
    sm.transition('game-over');
    screens.showGameOver(w);
  }

  const screens = createScreens(sprites, {
    onContinue: () => startLevel(Math.min(save.unlockedLevel, MAX_LEVEL)),
    onNewCampaign: () => { save = clearSave(); writeSave(save); startLevel(1); },
    onLevelSelect: () => goLevelSelect(),
    onStartLevel: (id) => { if (isLevelUnlocked(save, id)) startLevel(id); },
    onResume: () => app.resume(),
    onRestart: () => startLevel(app.world.level),
    onNext: () => startLevel(Math.min(app.world.level + 1, MAX_LEVEL)),
    onToStart: () => goStart(),
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
    if (sm.current === 'playing') hud.onEvents(w.events, w, app.speed);
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
