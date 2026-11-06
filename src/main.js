import './styles/main.css';
import { loadSprites } from './render/sprites.js';
import { createRenderer } from './render/renderer.js';
import { createClock } from './core/time.js';
import { levels } from './data/levels.js';
import { createWorld, step, STEP } from './sim/world.js';
import { canPlaceTower, placeTower, startWave, upgradeTower, sellTower, setTargeting } from './sim/commands.js';
import { createSandboxWorld, spawnTestWave } from './sim/sandbox.js';
import { getTowerDef } from './sim/towers.js';
import { createHud, REASON_TEXT } from './ui/hud.js';
import { attachInput } from './ui/input.js';

function levelFromUrl() {
  const n = Number(new URLSearchParams(location.search).get('level'));
  // Only level 1 has waves/maps until M3; anything else falls back to 1.
  return Number.isInteger(n) && n === 1 && levels[n - 1] ? n : 1;
}

const sandbox = new URLSearchParams(location.search).get('sandbox') === '1';

async function boot() {
  const sprites = await loadSprites();
  const canvas = document.getElementById('game');
  const renderer = createRenderer(canvas, sprites);
  const levelId = levelFromUrl();

  const app = {
    world: null,
    armed: null,
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
    onRetry: () => reset(),
    onUpgrade: () => app.upgrade(),
    onSell: () => app.sell(),
    onTargeting: (m) => app.setTargeting(m),
    onSpawnTest: () => app.spawnTest?.(),
  });

  function reset() {
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    app.world = sandbox ? createSandboxWorld(seed) : createWorld(levelId, { seed });
    app.armed = null;
    app.selectedId = null;
    hud.buildTowerList(app.world, { sandbox });
    if (import.meta.env.DEV) window.__td = { world: app.world, app };
  }

  reset();
  attachInput(canvas, app);

  const clock = createClock(STEP);
  let last = performance.now();
  function loop(now) {
    const w = app.world;
    const steps = clock.advance((now - last) / 1000);
    last = now;
    for (let i = 0; i < steps; i++) step(w, STEP);

    for (const ev of w.events) {
      if (ev.type === 'waveEnd') hud.flash(`Wave cleared  +${ev.stipend + (ev.hub || 0)} coins`);
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
    renderer.draw(w, { selectedTowerId: app.selectedId, ghost });
    hud.update(w, app);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('hud-msg').textContent = `Failed to start: ${err.message}`;
});
