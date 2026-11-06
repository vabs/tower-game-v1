import { getTowerDef, towerStats, towerLevel, canHitAir } from '../sim/towers.js';
import { upgradeCostOf, sellValue, MAX_LEVEL } from '../sim/commands.js';
import { levels, getUnlocksForLevel } from '../data/levels.js';
import { enemies } from '../data/enemies.js';
import { bosses, BOSS_SEQUENCE } from '../data/bosses.js';
import { INTRODUCED_AT } from '../data/waves.js';
import { medalFor } from '../core/medals.js';
import { summarizeWave } from './wavePreview.js';
import { levelSpecial, towerCardInfo, upgradeDelta, describeBuffs } from './towerInfo.js';
import { auraSourcesFor } from '../sim/auras.js';
import { contractFor } from '../sim/contracts.js';

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
  const out = levelSpecial(tower.def, towerLevel(tower));
  return out;
}

/**
 * Binds the DOM (top bar, tower list, selected panel, overlay) to world state.
 * Reads world, never mutates it; user intent goes out through callbacks.
 */
export function createHud(sprites, { onArm, onStart, onPause, onSpeed, onUpgrade, onSell, onTargeting, onSpawnTest, onMute }) {
  const el = {
    level: $('hud-level'), wave: $('hud-wave'), hp: $('hud-hp'), coins: $('hud-coins'),
    start: $('hud-start'), msg: $('hud-msg'), list: $('hud-tower-list'), spawnTest: $('hud-spawn-test'),
    selName: $('hud-selected'), selRange: $('hud-range'), selDps: $('hud-dps'), selLevel: $('hud-sel-level'),
    selDamage: $('hud-damage'), selRate: $('hud-rate'), special: $('hud-special'), buffs: $('hud-buffs'),
    targeting: $('hud-targeting'), upgrade: $('hud-upgrade'), sell: $('hud-sell'),
    hpIcon: $('hud-hp-icon'), coinIcon: $('hud-coin-icon'),
    pause: $('hud-pause'), mute: $('hud-mute'), speed: $('hud-speed'), speedIcon: $('hud-speed-icon'), speedLabel: $('hud-speed-label'), pauseIcon: $('hud-pause-icon'), medal: $('hud-medal'), brief: $('hud-brief'), unlock: $('hud-unlock'),
    mission: $('hud-mission'), missionToggle: $('hud-mission-toggle'), missionBody: $('hud-mission-body'), contract: $('hud-contract'),
    edge: $('fx-edge'), banner: $('fx-banner'), coinsChip: $('hud-coins-chip'), hpChip: $('hud-hp-chip'),
    preview: $('hud-preview'), previewHead: $('hud-preview-head'), previewNow: $('hud-preview-now'), previewThen: $('hud-preview-then'),
  };
  /** The mission card (map, waves, unlock tracker) is open at level start and folds away once wave 1 begins. */
  function setMissionOpen(open) {
    el.missionBody.hidden = !open;
    el.mission.classList.toggle('collapsed', !open);
    el.missionToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.missionToggle.querySelector('.caret').textContent = open ? 'v' : '>';
  }
  el.missionToggle.addEventListener('click', () => setMissionOpen(el.missionBody.hidden));
  const setSrc = (img, key) => { const sp = sprites[key]; if (sp && img.getAttribute('src') !== sp.src) img.src = sp.src; };
  setSrc(el.pauseIcon, 'ui/pause');
  setSrc(el.hpIcon, 'ui/heart');
  setSrc(el.coinIcon, 'ui/coin');
  let buttons = [];
  let msgTimer = null;
  let specialKey = '';
  let previewKey = '';
  let buffsKey = '';

  el.start.addEventListener('click', () => onStart());
  el.pause.addEventListener('click', () => onPause?.());
  el.mute.addEventListener('click', () => onMute?.());
  el.speed.addEventListener('click', () => onSpeed?.());
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
        b.addEventListener('click', () => {
          if (b.getAttribute('aria-disabled') === 'true') return flash(REASON_TEXT.unaffordable);
          onArm(id);
        });
        b.addEventListener('mouseenter', () => showTip(def, b));
        b.addEventListener('mouseleave', hideTip);
        b.addEventListener('focus', () => showTip(def, b));
        b.addEventListener('blur', hideTip);
        el.list.appendChild(b);
        buttons.push({ id, cost: def.levels[0].cost, el: b });
      }
    }
  }

  // ---- hover tooltip for tower buttons ----
  const tip = $('tower-tip');
  function hideTip() { tip.hidden = true; }
  function showTip(def, anchor) {
    const info = towerCardInfo(def);
    tip.textContent = '';
    const line = (cls, text) => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      tip.append(d);
    };
    line('tip-name', `${info.name}  (${info.cost} coins)`);
    line('tip-role', `${FAMILIES.find((f) => f[0] === info.family)?.[1] ?? info.family}: ${info.role}`);
    if (info.rate > 0) {
      line('tip-stats', `Damage ${info.damage}   Rate ${info.rate.toFixed(1)}/s   Range ${info.range.toFixed(1)}`);
      line('tip-dps', `DPS ${info.dps.toFixed(1)}`);
    } else line('tip-stats', 'No attack');
    for (const sp of info.special) line('tip-special', sp);
    line(info.air ? 'tip-air yes' : 'tip-air no', info.air ? 'Can hit air' : 'Ground only (cannot hit air)');
    tip.hidden = false;
    const r = anchor.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - tr.height - 8, r.top + r.height / 2 - tr.height / 2));
    tip.style.left = `${Math.round(r.right + 10)}px`;
    tip.style.top = `${Math.round(top)}px`;
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

  function setUpgrade(main, delta) {
    if (!el.upMain) {
      el.upMain = document.createElement('span');
      el.upMain.className = 'up-main';
      el.upDelta = document.createElement('span');
      el.upDelta.className = 'up-delta';
      el.upgrade.textContent = '';
      el.upgrade.append(el.upMain, el.upDelta);
    }
    setText(el.upMain, main);
    setText(el.upDelta, delta);
    el.upDelta.hidden = !delta;
  }

  function updateSelected(world, tower) {
    const over = world.phase === 'won' || world.phase === 'lost';
    if (!tower) {
      for (const n of [el.selName, el.selLevel, el.selDamage, el.selRate, el.selRange, el.selDps]) setText(n, n === el.selName ? 'None' : '-');
      setText(el.special, '');
      specialKey = '';
      buffsKey = '';
      el.buffs.textContent = '';
      el.targeting.disabled = true;
      el.upgrade.disabled = true;
      el.sell.disabled = true;
      setUpgrade('Upgrade', '');
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
    const buffs = describeBuffs(auraSourcesFor(world, tower));
    const bkey = `${tower.id}:${buffs.map((b) => b.text).join('|')}`;
    if (bkey !== buffsKey) {
      buffsKey = bkey;
      el.buffs.textContent = '';
      for (const b of buffs) {
        const d = document.createElement('div');
        d.className = 'buff' + (b.applied ? '' : ' dim');
        d.textContent = b.text;
        el.buffs.append(d);
      }
    }
    const attacks = s.baseRate > 0;
    el.targeting.disabled = !attacks;
    const airOpt = el.targeting.querySelector('option[value="air"]');
    if (airOpt) airOpt.hidden = tower.def.family !== 'anti-air';
    if (document.activeElement !== el.targeting && el.targeting.value !== tower.targeting) el.targeting.value = tower.targeting;

    const cost = upgradeCostOf(world, tower);
    if (cost === null) {
      setUpgrade('Max level', '');
      el.upgrade.disabled = true;
    } else {
      const d = upgradeDelta(tower.def, tower.level, cost, tower.aura?.fireRate ?? 0);
      setUpgrade(`Upgrade to L${tower.level + 1} (${cost}${world.phase === 'wave' ? ', +15%' : ''})`, d?.text ?? '');
      el.upgrade.disabled = over || world.coins < cost;
    }
    setText(el.sell, `Sell (+${sellValue(world, tower)}${world.phase === 'wave' ? ', 50%' : ', 70%'})`);
    el.sell.disabled = over;
  }

  /** Next-wave card: wave N groups (icon x count, air chevron, boss HP) and a tiny "then:" line for N+1. */
  function updatePreview(world, sandbox) {
    const over = world.phase === 'won' || world.phase === 'lost';
    const key = sandbox || over ? 'off' : `${world.level}:${world.waveIndex}:${world.phase === 'wave' ? 'live' : 'next'}:${world.difficulty?.id ?? ''}`;
    if (key === previewKey) return;
    previewKey = key;
    el.preview.hidden = key === 'off';
    if (key === 'off') return;
    const hpMult = world.difficulty?.hpMult ?? 1;
    const total = world.waves.length;
    const cur = summarizeWave(world.waves[world.waveIndex], world.level, { hpMult });
    const nxt = summarizeWave(world.waves[world.waveIndex + 1], world.level, { hpMult });
    const live = world.phase === 'wave';
    el.previewHead.textContent = `${live ? 'Wave' : 'Next'} ${world.waveIndex + 1}/${total}${live ? ' live' : ''}`;
    el.previewNow.textContent = '';
    el.previewThen.textContent = '';
    if (!cur) return;
    if (cur.supply) {
      const line = row(spriteImg('ui/crate'), `Supply drop `, spriteImg('ui/coin'), `+${cur.coins}`);
      line.className = 'pv-row pv-supply';
      el.previewNow.append(line);
    }
    for (const g of cur.groups) {
      const line = row(spriteImg(g.sprite), `${g.count}x ${g.name}`);
      line.className = 'pv-row' + (g.boss ? ' pv-boss' : '');
      line.title = `${g.name}: ${g.hp} HP each${g.air ? ', flies (anti-air only)' : ''}`;
      if (g.air) {
        const chev = spriteImg('ui/air_chevron');
        chev.className = 'pv-air';
        chev.title = 'Air unit';
        line.append(chev);
      }
      const hp = document.createElement('span');
      hp.className = 'pv-hp';
      hp.textContent = `${g.hp}hp`;
      line.append(hp);
      el.previewNow.append(line);
    }
    if (nxt) {
      const then = row('then: ');
      if (nxt.supply) then.append(spriteImg('ui/crate'), spriteImg('ui/coin'), `+${nxt.coins}`);
      for (const g of nxt.groups) {
        const part = document.createElement('span');
        part.className = 'pv-mini' + (g.boss ? ' pv-boss' : '');
        part.title = g.name;
        part.append(spriteImg(g.sprite), `${g.count}`);
        if (g.air) part.append(' ^');
        then.append(part);
      }
      el.previewThen.append(then);
    }
  }

  // ---- feedback juice: all cosmetic, durations scale with game speed ----
  const restart = (node, cls, ms) => {
    node.style.setProperty('--fx-ms', `${Math.round(ms)}ms`);
    node.classList.remove(cls);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(cls);
  };
  let bannerTimer = null;
  function banner(main, sub = '', kind = '', ms = 1900) {
    const b = el.banner;
    b.hidden = false;
    b.dataset.kind = kind;
    b.firstElementChild.textContent = main;
    b.lastElementChild.textContent = sub;
    restart(b, 'show', ms);
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; b.classList.remove('show'); }, ms);
  }

  /** React to sim events: wave/supply/boss banners and leak feedback. */
  function onEvents(events, world, speed = 1) {
    const sp = Math.max(1, speed);
    for (const ev of events) {
      if (ev.type === 'leak') {
        restart(el.edge, 'flash', 520 / sp);
        restart(el.hpChip, 'shake', 460 / sp);
      } else if (ev.type === 'bossPhase') {
        if (ev.phase === 'escorts') banner('Escorts inbound!', 'The boss calls for backup', 'boss', 2000 / sp);
        else banner('Boss enraged!', '+20% speed', 'boss', 2000 / sp);
      } else if (ev.type === 'waveStart') {
        if (ev.wave === 0) setMissionOpen(false);
        const wave = world.waves[ev.wave];
        const n = ev.wave + 1;
        if (wave?.supply) banner(`Wave ${n}`, `Supply drop +${wave.coins}`, 'supply', 2200 / sp);
        else if (wave?.enemies.some((g) => g.id.endsWith('_boss'))) banner(`Wave ${n}`, 'Boss incoming!', 'boss', 2400 / sp);
        else banner(`Wave ${n}`, '', '', 1500 / sp);
      }
    }
  }

  let lastCoins = null;
  let lastLevelKey = '';
  function chipFlash(world, sp) {
    const key = `${world.level}:${world.seed}`;
    if (key !== lastLevelKey) { lastLevelKey = key; lastCoins = world.coins; return; }
    if (world.coins === lastCoins) return;
    restart(el.coinsChip, world.coins > lastCoins ? 'gain' : 'spend', 420 / Math.max(1, sp));
    lastCoins = world.coins;
  }

  function update(world, app) {
    const total = world.waves.length;
    el.level.textContent = world.level;
    el.wave.textContent = `${Math.min(world.waveIndex + 1, total)}/${total}`;
    el.hp.textContent = `${world.hp}/${world.maxHp}`;
    el.coins.textContent = world.coins;
    chipFlash(world, app.speed ?? 1);
    updateStart(world);
    const sp = app.speed ?? 1;
    setSrc(el.speedIcon, `ui/speed_${sp}x`);
    if (el.speed.dataset.speed !== String(sp)) {
      el.speed.dataset.speed = String(sp);
      el.speed.setAttribute('aria-label', `Game speed ${sp}x`);
      el.speedLabel.textContent = `${sp}x`;
    }
    setSrc(el.medal, `ui/medal_${medalFor(world.stats.hpLost)}`);

    for (const b of buttons) {
      const poor = world.coins < b.cost;
      b.el.setAttribute('aria-disabled', poor ? 'true' : 'false');
      b.el.classList.toggle('poor', poor);
      b.el.classList.toggle('armed', app.armed === b.id);
    }

    const tower = app.selectedId != null ? world.towers.find((t) => t.id === app.selectedId) : null;
    updateSelected(world, tower);

    updatePreview(world, !!app.sandbox);

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
    el.mission.hidden = sandbox;
    el.contract.textContent = '';
    setMissionOpen(true);
    if (sandbox) return;
    const lv = levels[world.level - 1];
    const mapName = lv.mapType[0].toUpperCase() + lv.mapType.slice(1);
    const waves = `${world.waves.length} waves${lv.supplyDropAfterWave != null ? ' (1 supply drop)' : ''}`;
    el.brief.append(row(`${mapName}, ${waves}, ${world.difficulty?.name ?? 'Regular'}`));
    const fresh = [...enemies.filter((e) => INTRODUCED_AT[e.id] === world.level), ...(BOSS_SEQUENCE[lv.boss] ?? []).map((id) => bosses.find((b) => b.id === id)).filter(Boolean)];
    if (fresh.length) {
      const line = row('New: ');
      line.className = 'brief-new';
      for (const e of fresh) {
        const sp = spriteImg(e.sprite ?? `enemies/${e.id}`);
        sp.title = e.name;
        line.append(sp);
      }
      line.title = fresh.map((e) => e.name).join(', ');
      if (fresh.length <= 1) line.append(fresh.map((e) => e.name).join(', '));
      el.brief.append(line);
    }
    const contract = contractFor(world.level);
    el.contract.append(`Contract: ${contract.short}`);
    el.contract.title = `Optional contract: ${contract.label}. Finish the level within this rule for a badge.`;
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
      line.title = `Unlocks at Level ${next.level}`;
      line.append(` (L${next.level})`);
      el.unlock.append(line);
    }
  }

  /** Reflect the mute state on the top-bar speaker button. */
  function setMuted(muted) {
    el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    el.mute.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
    el.mute.title = muted ? 'Unmute (M)' : 'Mute (M)';
  }

  return { buildTowerList, buildBrief, update, flash, onEvents, banner, setMuted };
}
