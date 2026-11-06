import { getTowerDef, towerStats, towerLevel, canHitAir } from '../sim/towers.js';
import { upgradeCostOf, sellValue, MAX_LEVEL } from '../sim/commands.js';
import { levels, getUnlocksForLevel } from '../data/levels.js';
import { enemies } from '../data/enemies.js';
import { bosses, BOSS_SEQUENCE } from '../data/bosses.js';
import { INTRODUCED_AT } from '../data/waves.js';

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
  max_level: 'Already max level',
  not_found: 'No such tower',
  bad_mode: 'Unknown targeting mode',
};

const FAMILIES = [
  ['assault', 'Assault'],
  ['precision', 'Precision'],
  ['explosive', 'Explosive'],
  ['control', 'Control'],
  ['support', 'Support'],
  ['anti-air', 'Anti-Air'],
];

/** One line of per-tower special stats for the selected panel. */
export function describeSpecial(tower) {
  const lv = towerLevel(tower);
  const out = [];
  if (tower.def.special?.spoolUp) out.push(`Spool-up ${tower.def.special.spoolUp}s`);
  if (lv.crit) out.push(`Crit ${Math.round(lv.crit * 100)}% (2x)`);
  if (lv.pierce) out.push(`Pierce ${lv.pierce}`);
  if (lv.splash) out.push(`Splash ${lv.splash} tiles`);
  if (lv.airBonus) out.push(`+${Math.round(lv.airBonus * 100)}% vs air, 60% vs ground`);
  if (lv.slow) out.push(`Slow ${Math.round(lv.slow * 100)}% for ${lv.slowDuration}s`);
  if (lv.burnDps) out.push(`Burn ${lv.burnDps}/s for ${lv.burnDuration}s`);
  if (lv.stun) out.push(`Stun ${lv.stun}s`);
  if (lv.chains) out.push(`Chain ${lv.chains} hops, slow ${Math.round(lv.chainSlow * 100)}%`);
  if (lv.fieldRadius) out.push(`Gas field ${lv.fieldDuration}s, slow ${Math.round(lv.fieldSlow * 100)}%`);
  if (lv.damageBoost) out.push(`Marked +${Math.round(lv.damageBoost * 100)}% dmg taken`);
  if (lv.armorDebuff) out.push(`Armor -${Math.round(lv.armorDebuff * 100)}%`);
  if (lv.fireRateBoost) out.push(`Aura +${Math.round(lv.fireRateBoost * 100)}% fire rate (${lv.auraRange} tiles)`);
  if (lv.rangeBoost) out.push(`Aura +${Math.round(lv.rangeBoost * 100)}% range (${lv.range} tiles)`);
  if (lv.endWaveCoins) out.push(`+${lv.endWaveCoins} coins per wave`);
  const aura = tower.aura;
  if (aura && (aura.fireRate || aura.range)) {
    const parts = [];
    if (aura.fireRate) parts.push(`+${Math.round(aura.fireRate * 100)}% rate`);
    if (aura.range) parts.push(`+${Math.round(aura.range * 100)}% range`);
    out.push(`Boosted ${parts.join(', ')}`);
  }
  return out;
}

/**
 * Binds the DOM (top bar, tower list, selected panel, overlay) to world state.
 * Reads world, never mutates it; user intent goes out through callbacks.
 */
export function createHud(sprites, { onArm, onStart, onPause, onUpgrade, onSell, onTargeting, onSpawnTest }) {
  const el = {
    level: $('hud-level'), wave: $('hud-wave'), hp: $('hud-hp'), coins: $('hud-coins'),
    start: $('hud-start'), msg: $('hud-msg'), list: $('hud-tower-list'), spawnTest: $('hud-spawn-test'),
    selName: $('hud-selected'), selRange: $('hud-range'), selDps: $('hud-dps'), selLevel: $('hud-sel-level'),
    selDamage: $('hud-damage'), selRate: $('hud-rate'), special: $('hud-special'),
    targeting: $('hud-targeting'), upgrade: $('hud-upgrade'), sell: $('hud-sell'),
    pause: $('hud-pause'), brief: $('hud-brief'), unlock: $('hud-unlock'),
  };
  let buttons = [];
  let msgTimer = null;
  let specialKey = '';

  el.start.addEventListener('click', () => onStart());
  el.pause.addEventListener('click', () => onPause?.());
  el.upgrade.addEventListener('click', () => onUpgrade());
  el.sell.addEventListener('click', () => onSell());
  el.targeting.addEventListener('change', () => onTargeting(el.targeting.value));
  el.spawnTest.addEventListener('click', () => onSpawnTest?.());

  function buildTowerList(world, { sandbox = false } = {}) {
    el.list.textContent = '';
    el.spawnTest.hidden = !sandbox;
    buttons = [];
    for (const [family, label] of FAMILIES) {
      const ids = world.unlocked.filter((id) => getTowerDef(id)?.family === family);
      if (!ids.length) continue;
      const head = document.createElement('h4');
      head.className = 'family-head';
      head.textContent = label;
      el.list.appendChild(head);
      for (const id of ids) {
        const def = getTowerDef(id);
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.id = id;
        b.dataset.family = family;
        const img = document.createElement('img');
        const spr = sprites[`towers/${id}_l1`];
        if (spr) img.src = spr.src;
        img.alt = '';
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = def.name;
        if (canHitAir(def)) {
          const chev = document.createElement('img');
          chev.className = 'aa-chevron';
          chev.alt = 'anti-air';
          chev.title = 'Hits air units';
          const c = sprites['ui/air_chevron'];
          if (c) chev.src = c.src;
          name.appendChild(chev);
        }
        const cost = document.createElement('span');
        cost.className = 'cost';
        cost.textContent = String(def.levels[0].cost);
        b.append(img, name, cost);
        b.addEventListener('click', () => onArm(id));
        el.list.appendChild(b);
        buttons.push({ id, cost: def.levels[0].cost, el: b });
      }
    }
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

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function updateSelected(world, tower) {
    const over = world.phase === 'won' || world.phase === 'lost';
    if (!tower) {
      for (const n of [el.selName, el.selLevel, el.selDamage, el.selRate, el.selRange, el.selDps]) setText(n, n === el.selName ? 'None' : '-');
      setText(el.special, '');
      specialKey = '';
      el.targeting.disabled = true;
      el.upgrade.disabled = true;
      el.sell.disabled = true;
      setText(el.upgrade, 'Upgrade');
      setText(el.sell, 'Sell');
      return;
    }
    const s = towerStats(tower);
    setText(el.selName, tower.def.name);
    setText(el.selLevel, `${tower.level}/${MAX_LEVEL}`);
    setText(el.selDamage, String(s.damage));
    setText(el.selRate, s.baseRate > 0 ? `${s.rate.toFixed(2)}/s` : '-');
    setText(el.selRange, s.range > 0 ? `${s.range.toFixed(1)} tiles` : '-');
    setText(el.selDps, s.dps.toFixed(1));
    const lines = describeSpecial(tower);
    const key = `${tower.id}:${tower.level}:${lines.join('|')}`;
    if (key !== specialKey) {
      specialKey = key;
      el.special.textContent = '';
      for (const l of lines) {
        const d = document.createElement('div');
        d.textContent = l;
        el.special.appendChild(d);
      }
    }
    const attacks = s.baseRate > 0;
    el.targeting.disabled = !attacks;
    const airOpt = el.targeting.querySelector('option[value="air"]');
    if (airOpt) airOpt.hidden = tower.def.family !== 'anti-air';
    if (document.activeElement !== el.targeting && el.targeting.value !== tower.targeting) el.targeting.value = tower.targeting;

    const cost = upgradeCostOf(world, tower);
    if (cost === null) {
      setText(el.upgrade, 'Max level');
      el.upgrade.disabled = true;
    } else {
      setText(el.upgrade, `Upgrade to L${tower.level + 1} (${cost}${world.phase === 'wave' ? ', +15%' : ''})`);
      el.upgrade.disabled = over || world.coins < cost;
    }
    setText(el.sell, `Sell (+${sellValue(world, tower)}${world.phase === 'wave' ? ', 50%' : ', 70%'})`);
    el.sell.disabled = over;
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
    updateSelected(world, tower);

    el.brief.classList.toggle('fresh', world.waveIndex === 0 && world.phase === 'build');
  }

  const row = (...kids) => {
    const d = document.createElement('div');
    d.append(...kids);
    return d;
  };
  const spriteImg = (key) => {
    const img = document.createElement('img');
    img.alt = '';
    const sp = sprites[key];
    if (sp) img.src = sp.src;
    return img;
  };

  /** Compact mission brief (map, waves, new enemies, medal rule) and next-tower-unlock tracker. */
  function buildBrief(world, { sandbox = false } = {}) {
    el.msg.textContent = '';
    el.brief.textContent = '';
    el.unlock.textContent = '';
    el.brief.parentElement.hidden = sandbox;
    if (sandbox) return;
    const lv = levels[world.level - 1];
    const mapName = lv.mapType[0].toUpperCase() + lv.mapType.slice(1);
    const waves = `${world.waves.length} waves${lv.supplyDropAfterWave != null ? ' (1 supply drop)' : ''}`;
    el.brief.append(row(`Map: ${mapName}`), row(waves));
    const fresh = [...enemies.filter((e) => INTRODUCED_AT[e.id] === world.level), ...(BOSS_SEQUENCE[lv.boss] ?? []).map((id) => bosses.find((b) => b.id === id)).filter(Boolean)];
    if (fresh.length) {
      const line = row('New: ');
      line.className = 'brief-new';
      for (const e of fresh) {
        const sp = spriteImg(e.sprite ?? `enemies/${e.id}`);
        sp.title = e.name;
        line.append(sp, `${e.name} `);
      }
      el.brief.append(line);
    }
    const goal = row('No leaks for Gold');
    goal.className = 'brief-goal';
    el.brief.append(goal);

    let next = null;
    for (let i = world.level + 1; i <= levels.length && !next; i++) {
      const ids = getUnlocksForLevel(i);
      if (ids.length) next = { level: i, ids };
    }
    if (!next) el.unlock.append(row('All towers unlocked'));
    else {
      const def = getTowerDef(next.ids[0]);
      const line = row(spriteImg(`towers/${next.ids[0]}_l1`), `${def.name}${next.ids.length > 1 ? ` +${next.ids.length - 1}` : ''}`);
      line.className = 'unlock-next';
      el.unlock.append(line, row(`unlocks at Level ${next.level}`));
    }
  }

  return { buildTowerList, buildBrief, update, flash };
}
