import { getTowerDef, towerStats } from '../sim/towers.js';

const $ = (id) => document.getElementById(id);

export const REASON_TEXT = {
  not_buildable: "Can't build there",
  occupied: 'Tile already has a tower',
  unaffordable: 'Not enough coins',
  locked: 'Tower not unlocked',
  unknown_tower: 'Unknown tower',
  game_over: 'Game over',
  wrong_phase: 'A wave is already running',
  no_more_waves: 'No more waves',
};

/**
 * Binds the DOM (top bar, tower list, selected panel, overlay) to world state.
 * Reads world, never mutates it; user intent goes out through callbacks.
 */
export function createHud(sprites, { onArm, onStart, onRetry }) {
  const el = {
    level: $('hud-level'), wave: $('hud-wave'), hp: $('hud-hp'), coins: $('hud-coins'),
    start: $('hud-start'), msg: $('hud-msg'), list: $('hud-tower-list'),
    selName: $('hud-selected'), selRange: $('hud-range'), selDps: $('hud-dps'), selLevel: $('hud-sel-level'),
    overlay: $('overlay'), title: $('overlay-title'), text: $('overlay-text'), retry: $('overlay-retry'),
  };
  let buttons = [];
  let msgTimer = null;

  el.start.addEventListener('click', () => onStart());
  el.retry.addEventListener('click', () => onRetry());

  function buildTowerList(world) {
    el.list.textContent = '';
    buttons = world.unlocked.map((id) => {
      const def = getTowerDef(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = id;
      const img = document.createElement('img');
      const spr = sprites[`towers/${id}_l1`];
      if (spr) img.src = spr.src;
      img.alt = '';
      const name = document.createElement('span');
      name.textContent = def.name;
      const cost = document.createElement('span');
      cost.className = 'cost';
      cost.textContent = String(def.levels[0].cost);
      b.append(img, name, cost);
      b.addEventListener('click', () => onArm(id));
      el.list.appendChild(b);
      return { id, cost: def.levels[0].cost, el: b };
    });
  }

  function flash(text, ms = 2200) {
    el.msg.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.msg.textContent = ''; }, ms);
  }

  function updateStart(world) {
    const total = world.waves.length;
    const next = world.waveIndex + 1;
    let label = 'Start Wave';
    let disabled = false;
    if (world.phase === 'build') {
      label = world.countdown === null
        ? `Start Wave ${next}`
        : `Call Wave ${next} (${Math.ceil(world.countdown)}s)`;
    } else if (world.phase === 'wave') {
      label = `Wave ${Math.min(next, total)} in progress`;
      disabled = true;
    } else {
      label = world.phase === 'won' ? 'Level cleared' : 'Defeated';
      disabled = true;
    }
    if (el.start.textContent !== label) el.start.textContent = label;
    el.start.disabled = disabled;
  }

  function update(world, app) {
    const total = world.waves.length;
    el.level.textContent = world.level;
    el.wave.textContent = `${Math.min(world.waveIndex + 1, total)}/${total}`;
    el.hp.textContent = `${world.hp}/${world.maxHp}`;
    el.coins.textContent = world.coins;
    updateStart(world);

    for (const b of buttons) {
      b.el.disabled = world.coins < b.cost;
      b.el.classList.toggle('armed', app.armed === b.id);
    }

    const tower = app.selectedId != null ? world.towers.find((t) => t.id === app.selectedId) : null;
    if (tower) {
      const s = towerStats(tower);
      el.selName.textContent = tower.def.name;
      el.selLevel.textContent = tower.level;
      el.selRange.textContent = `${s.range.toFixed(1)} tiles`;
      el.selDps.textContent = s.dps.toFixed(1);
    } else {
      el.selName.textContent = 'None';
      el.selLevel.textContent = '-';
      el.selRange.textContent = '-';
      el.selDps.textContent = '-';
    }

    const over = world.phase === 'won' || world.phase === 'lost';
    el.overlay.hidden = !over;
    if (over) {
      el.title.textContent = world.phase === 'won' ? 'Victory' : 'Defeat';
      el.text.textContent = world.phase === 'won'
        ? `Level ${world.level} cleared with ${world.hp}/${world.maxHp} HP left.`
        : `Your base fell on wave ${Math.min(world.waveIndex + 1, total)}.`;
    }
  }

  return { buildTowerList, update, flash };
}
