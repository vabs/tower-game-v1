import { levels } from '../data/levels.js';
import { getTowerDef } from '../sim/towers.js';
import { snapshotStats } from '../sim/stats.js';
import { summarizeTowerStats, summarizeEnemyStats } from './analytics.js';
import { isLevelUnlocked, hasProgress, summarizeCampaign } from '../core/save.js';
import { SILVER_MAX_HP_LOST } from '../core/medals.js';
import { CONTROLS } from './hotkeys.js';
import { contractFor } from '../sim/contracts.js';
import { DIFFICULTIES, DIFFICULTY_IDS, getDifficulty } from '../core/difficulty.js';

const CHAPTERS = ['Recon', 'Frontline', 'Breakthrough', 'Siege', 'Final Stand'];
export const MEDAL_LABEL = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Tiny DOM builder: h('div.cls', {attrs}, ...children|strings). */
function h(spec, attrs, ...kids) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && typeof attrs !== 'string') {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'onclick') el.addEventListener('click', v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  } else if (attrs != null) kids.unshift(attrs);
  for (const k of kids) if (k != null && k !== false) el.append(k);
  return el;
}

export function createScreens(sprites, on) {
  const root = document.getElementById('screens');
  let current = null;
  let audioSyncs = [];

  const icon = (key, cls = 'px-icon', alt = '') => {
    const img = h('img.' + cls, { alt });
    const s = sprites[key];
    if (s) img.src = s.src;
    return img;
  };
  const button = (label, handler, { primary = false, id, disabled = false, iconKey = null } = {}) => {
    const b = h('button.btn' + (primary ? '.primary' : ''), { type: 'button', id, onclick: handler, disabled });
    if (iconKey) b.append(icon(iconKey, 'px-icon btn-icon', ''), ' ');
    b.append(label);
    return b;
  };

  function mount(name, box, { dim = false, bg = false } = {}) {
    root.textContent = '';
    root.dataset.screen = name;
    root.classList.toggle('dim', dim);
    if (bg) {
      // Slowly panning, dimmed menu art (480x264 source, drawn large with pixelated scaling).
      const art = h('div.menu-bg');
      const src = sprites['ui/menu_bg']?.src;
      if (src) art.style.backgroundImage = `url("${src}")`;
      root.append(art, h('div.menu-bg-dim'));
    }
    root.append(h('div.screen-box.screen-' + name, null, ...box));
    root.hidden = false;
    // Game controls under an overlay must not be focusable or clickable.
    const app = document.getElementById('app');
    if (app) app.inert = true;
    current = name;
    root.querySelector('.btn.primary')?.focus({ preventScroll: true });
  }

  function hide() {
    const app = document.getElementById('app');
    if (app) app.inert = false;
    root.hidden = true;
    root.textContent = '';
    delete root.dataset.screen;
    current = null;
  }

  // ---- shared analytics panels (pause + end screens) ----
  function analyticsPanels(world) {
    const snap = snapshotStats(world);
    const towerRows = summarizeTowerStats(snap.towers);
    const enemyRows = summarizeEnemyStats(snap.enemies);

    const tbody = h('tbody');
    for (const t of towerRows) {
      tbody.append(h('tr',
        h('td.tname', icon(`towers/${t.typeId}_l1`, 'px-icon sm'), h('span', { text: t.name })),
        h('td', { text: String(t.damage) }),
        h('td', { text: String(t.kills) }),
        h('td', { text: String(t.spent) }),
        h('td', { text: t.dpc.toFixed(2) })));
    }
    const towerPanel = h('section.an-panel', { 'data-panel': 'towers' },
      h('h3', { text: 'Tower Performance' }),
      towerRows.length
        ? h('div.an-scroll', h('table.an-table',
          h('thead', h('tr', ...['Tower', 'Damage', 'Kills', 'Spent', 'Dmg/coin'].map((x) => h('th', { text: x })))), tbody))
        : h('p.muted', { text: 'No towers built yet.' }));

    const grid = h('div.intel-grid');
    for (const e of enemyRows) {
      grid.append(h('div.intel-card' + (e.boss ? '.boss' : ''),
        icon(e.sprite, 'px-icon md', e.name),
        h('div.intel-main',
          h('div.intel-name', { text: e.name + (e.type === 'air' ? ' (air)' : '') }),
          h('div.intel-line', { text: `HP ${e.hp}  Spd ${e.speed}` }),
          h('div.intel-line', { text: `Seen ${e.seen}  Killed ${e.killed}  Leaked ${e.leaked}` }))));
    }
    const enemyPanel = h('section.an-panel', { 'data-panel': 'enemies' },
      h('h3', { text: 'Enemy Intel' }),
      enemyRows.length ? h('div.an-scroll', grid) : h('p.muted', { text: 'No enemies encountered yet.' }));
    return h('div.an-panels', towerPanel, enemyPanel);
  }

  /** Segmented Recruit / Regular / Veteran picker; updates in place and saves through on.onSetDifficulty. */
  function difficultyPicker(save, { compact = false } = {}) {
    const box = h('div.diff-picker' + (compact ? '.compact' : ''), { role: 'radiogroup', 'aria-label': 'Difficulty' });
    const blurb = h('div.diff-blurb', { text: getDifficulty(save.difficulty).blurb });
    const btns = DIFFICULTY_IDS.map((id) => {
      const d = DIFFICULTIES[id];
      return h('button.diff-btn', {
        type: 'button', id: `btn-diff-${id}`, role: 'radio', 'data-difficulty': id, title: d.blurb,
        onclick: () => {
          on.onSetDifficulty(id);
          sync();
        },
        text: d.name,
      });
    });
    function sync() {
      for (const b of btns) {
        const on_ = b.dataset.difficulty === save.difficulty;
        b.classList.toggle('active', on_);
        b.setAttribute('aria-checked', on_ ? 'true' : 'false');
      }
      blurb.textContent = getDifficulty(save.difficulty).blurb;
    }
    sync();
    box.append(...btns);
    return compact ? box : h('div.diff-wrap', box, blurb);
  }

  /**
   * Music / SFX sliders plus a mute button. Changes go out through on.onSetAudio(patch, commit): live while
   * dragging (commit false), saved on release (commit true). `settings` is the save's live settings object.
   */
  function audioControls(settings, { title = true } = {}) {
    const slider = (key, label) => {
      const out = h('span.vol-val', { 'data-vol': key, text: `${Math.round(settings[key] * 100)}%` });
      const input = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(settings[key] * 100), id: `vol-${key}`, 'aria-label': `${label} volume` });
      input.addEventListener('input', () => {
        out.textContent = `${input.value}%`;
        on.onSetAudio?.({ [key]: Number(input.value) / 100 }, false);
      });
      input.addEventListener('change', () => on.onSetAudio?.({ [key]: Number(input.value) / 100 }, true));
      return h('label.vol', h('span', { text: label }), input, out);
    };
    const mute = h('button.btn.small', { type: 'button', id: 'btn-mute-audio', 'aria-pressed': 'false', onclick: () => on.onToggleMute?.() });
    const sync = () => {
      mute.textContent = settings.muted ? 'Unmute' : 'Mute';
      mute.setAttribute('aria-pressed', settings.muted ? 'true' : 'false');
    };
    sync();
    sync.el = mute;
    audioSyncs.push(sync);
    return h('div.audio-controls', { 'data-testid': 'audio-controls' },
      title ? h('span.audio-title', { text: 'Audio' }) : null,
      slider('music', 'Music'), slider('sfx', 'Effects'), mute);
  }

  /** Re-read the mute state into any audio controls on screen (after the M key, say). */
  const refreshAudio = () => {
    audioSyncs = audioSyncs.filter((f) => f.el.isConnected); // drop controls of screens that are gone
    audioSyncs.forEach((f) => f());
  };

  // ---- Start ----
  function showStart(save) {
    const progress = hasProgress(save);
    let armedReset = false;
    const newBtn = button('New Campaign', () => {
      if (progress && !armedReset) {
        armedReset = true;
        newBtn.textContent = 'Erase progress? Click again';
        newBtn.classList.add('danger');
        return;
      }
      on.onNewCampaign();
    }, { id: 'btn-new' });
    mount('start', [
      h('div.title-art', icon('towers/gatling_turret_l5', 'px-icon xl'), icon('towers/rail_autocannon_l5', 'px-icon xl'), icon('towers/aa_mg_l5', 'px-icon xl')),
      h('h1.title-logo', { 'aria-label': 'Tower Defence' }, icon('ui/title_logo', 'logo-img', 'Tower Defence')),
      h('p.subtitle', { text: '50 missions. 30 towers. Hold the line.' }),
      progress ? h('p.contracts-total', { 'data-testid': 'contracts-total', text: `Contracts completed: ${summarizeCampaign(save).contracts} / ${levels.length}` }) : null,
      difficultyPicker(save),
      h('div.audio-row', audioControls(save.settings)),
      h('div.menu',
        progress ? button(`Continue (Level ${save.unlockedLevel})`, () => on.onContinue(), { primary: true, id: 'btn-continue' }) : null,
        newBtn,
        button('Level Select', () => on.onLevelSelect(), { id: 'btn-levels', primary: !progress })),
    ], { dim: false, bg: true });
  }

  // ---- Level Select ----
  function showLevelSelect(save) {
    const summary = summarizeCampaign(save);
    const rows = [];
    for (let c = 0; c < 5; c++) {
      const row = h('div.chapter-row');
      for (let i = 1; i <= 10; i++) {
        const id = c * 10 + i;
        const lv = levels[id - 1];
        const unlocked = isLevelUnlocked(save, id);
        const medal = save.medals[id];
        const tags = [];
        if (lv.boss) tags.push('boss');
        if (lv.supplyDropAfterWave != null) tags.push('supply');
        const title = [`Level ${id}`, `${lv.mapType} map`, `${lv.combatWaves} waves`, lv.boss ? 'boss' : null,
          lv.supplyDropAfterWave != null ? 'supply drop' : null, unlocked ? null : 'locked'].filter(Boolean).join(', ');
        const cell = h('button.lvl' + (unlocked ? '' : '.locked') + (medal ? '.cleared' : '') + (lv.boss ? '.is-boss' : ''), {
          type: 'button', 'data-level': id, 'data-locked': unlocked ? 'false' : 'true', 'data-medal': medal, title,
          disabled: !unlocked, onclick: () => on.onStartLevel(id),
        },
        h('span.lvl-num', { text: String(id) }),
        medal && DIFFICULTIES[save.medalDifficulty?.[id]]?.tag
          ? h('span.lvl-diff', { title: `Medal earned on ${DIFFICULTIES[save.medalDifficulty[id]].name}`, text: DIFFICULTIES[save.medalDifficulty[id]].tag })
          : null,
        save.contracts?.[id]
          ? h('span.lvl-contract', { title: `Contract complete: ${contractFor(id).label}`, 'data-contract': 'done', text: '\u2713' })
          : null,
        h('span.lvl-badge', unlocked
          ? icon(medal ? `ui/medal_${medal}` : 'ui/medal_empty', 'px-icon', medal ? MEDAL_LABEL[medal] : 'no medal')
          : icon('ui/lock', 'px-icon', 'locked')),
        h('span.lvl-tags',
          lv.boss ? h('span.tag.boss', { text: 'BOSS' }) : null,
          lv.supplyDropAfterWave != null ? icon('ui/crate', 'px-icon xs', 'supply drop') : null));
        row.append(cell);
      }
      rows.push(h('div.chapter', h('h3', { text: `Chapter ${c + 1}: ${CHAPTERS[c]}` }), row));
    }
    mount('level-select', [
      h('div.screen-head',
        h('h2', { text: 'Level Select' }),
        difficultyPicker(save, { compact: true }),
        h('div.medal-count',
          ...['gold', 'silver', 'bronze'].map((m) => h('span', icon(`ui/medal_${m}`, 'px-icon', m), ` ${summary[m]}`)),
          h('span.contract-count', { title: 'Optional contracts completed', 'data-testid': 'contract-count', text: `\u2713 ${summary.contracts}` })),
        button('Back', () => on.onToStart(), { id: 'btn-back' })),
      h('div.chapters', ...rows),
      h('p.legend.muted', 'BOSS = boss wave. Crate = supply drop wave. Gold: no HP lost. Silver: 5 or less. R / V tag = medal earned on Recruit / Veteran. Green check = optional contract done.'),
    ]);
  }

  // ---- Pause ----
  function showPause(world, save) {
    mount('paused', [
      h('h2', { text: 'Paused' }),
      h('p.muted', { text: `Level ${world.level}  Wave ${Math.min(world.waveIndex + 1, world.waves.length)}/${world.waves.length}  HP ${world.hp}/${world.maxHp}  Coins ${world.coins}` }),
      h('div.btn-row',
        button('Resume', () => on.onResume(), { primary: true, id: 'btn-resume', iconKey: 'ui/play' }),
        button('Restart', () => on.onRestart(), { id: 'btn-restart' }),
        button('Level Select', () => on.onLevelSelect(), { id: 'btn-levels' })),
      h('section.an-panel.audio-panel', { 'data-panel': 'audio' }, h('h3', { text: 'Audio' }), audioControls(save.settings, { title: false })),
      h('section.an-panel.controls', { 'data-panel': 'controls' },
        h('h3', { text: 'Controls' }),
        h('div.controls-grid', ...CONTROLS.flatMap(([k, d]) => [h('kbd', { text: k }), h('span', { text: d })]))),
      analyticsPanels(world),
    ], { dim: true });
  }

  // ---- Level Complete ----
  function showLevelComplete({ world, medal, hpLost, improved, nextUnlocks, contract }) {
    const hint = medal === 'gold' ? null
      : medal === 'silver' ? 'Gold needs no HP lost.'
        : `Silver needs ${SILVER_MAX_HP_LOST} or less HP lost, Gold none.`;
    mount('level-complete', [
      h('h2', { text: `Level ${world.level} Cleared` }),
      h('div.medal-big', { 'data-medal': medal }, icon(`ui/medal_${medal}_lg`, 'px-icon lg', MEDAL_LABEL[medal]),
        h('div.medal-name', { text: `${MEDAL_LABEL[medal]} Medal${improved ? '  (new best)' : ''}` })),
      hint ? h('p.muted', { text: hint }) : null,
      contractLine(contract),
      h('div.stat-row',
        stat('Time', formatTime(world.time)),
        stat('HP lost', `${hpLost} / ${world.maxHp}`),
        stat('Leaks', String(Object.values(world.stats.enemies).reduce((a, e) => a + e.leaked, 0))),
        stat('Spare coins', String(world.coins))),
      nextUnlocks.length
        ? h('div.unlock-line', { 'data-testid': 'unlocked' }, 'Unlocked: ', ...nextUnlocks.flatMap((id) => [icon(`towers/${id}_l1`, 'px-icon sm'), ` ${getTowerDef(id)?.name ?? id}  `]))
        : null,
      h('div.btn-row',
        button('Next Level', () => on.onNext(), { primary: true, id: 'btn-next' }),
        button('Replay', () => on.onRestart(), { id: 'btn-replay' }),
        button('Level Select', () => on.onLevelSelect(), { id: 'btn-levels' })),
      analyticsPanels(world),
    ], { dim: true });
  }

  // ---- Game Over ----
  function showGameOver(world) {
    const leaks = Object.values(world.stats.enemies).reduce((a, e) => a + e.leaked, 0);
    mount('game-over', [
      h('h2.bad', { text: 'Base Overrun' }),
      h('p', { text: `Your base fell on wave ${Math.min(world.waveIndex + 1, world.waves.length)} of ${world.waves.length}.` }),
      h('div.stat-row',
        stat('HP lost', `${world.stats.hpLost} / ${world.maxHp}`),
        stat('Time', formatTime(world.time)),
        stat('Wave reached', `${Math.min(world.waveIndex + 1, world.waves.length)}`),
        stat('Leaks', String(leaks))),
      h('div.btn-row',
        button('Retry', () => on.onRestart(), { primary: true, id: 'btn-retry' }),
        button('Level Select', () => on.onLevelSelect(), { id: 'btn-levels' })),
      analyticsPanels(world),
    ], { dim: true });
  }

  // ---- Game End ----
  function showGameEnd({ world, save, medal, contract }) {
    const sum = summarizeCampaign(save);
    mount('game-end', [
      h('h1.title', { text: 'CAMPAIGN COMPLETE' }),
      h('p', { text: `Level 50 cleared with a ${MEDAL_LABEL[medal]} medal.` }),
      contractLine(contract),
      h('div.stat-row',
        ...['gold', 'silver', 'bronze'].map((m) => h('div.stat', icon(`ui/medal_${m}`, 'px-icon md', m), h('b', { text: String(sum[m]) }), h('span', { text: MEDAL_LABEL[m] }))),
        stat('Levels cleared', `${sum.cleared} / ${levels.length}`),
        stat('Contracts', `${sum.contracts} / ${levels.length}`),
        stat('Play time', formatTime(sum.playTime))),
      h('section.an-panel', { 'data-panel': 'best-towers' }, h('h3', { text: 'Best Towers' }),
        sum.bestTowers.length
          ? h('div.best-towers', ...sum.bestTowers.map((t) => h('div.best',
            icon(`towers/${t.typeId}_l1`, 'px-icon md'),
            h('div', h('b', { text: getTowerDef(t.typeId)?.name ?? t.typeId }), h('div.muted', { text: `${Math.round(t.damage)} damage, ${t.kills} kills` })))))
          : h('p.muted', { text: 'No data.' })),
      h('div.btn-row',
        button('Level Select', () => on.onLevelSelect(), { primary: true, id: 'btn-levels' }),
        button('Main Menu', () => on.onToStart(), { id: 'btn-menu' })),
      h('details.final-run', h('summary', { text: 'Level 50 recap' }), analyticsPanels(world)),
    ], { dim: true });
  }

  /** "Contract complete" / "Contract failed" line with the rule that was set. */
  const contractLine = (contract) => contract
    ? h('div.contract-result' + (contract.done ? '.done' : '.failed'), { 'data-testid': 'contract-result', 'data-done': contract.done ? 'true' : 'false' },
      h('b', { text: contract.done ? 'Contract complete \u2713' : 'Contract failed \u2717' }),
      h('span', { text: ` ${contract.label}` }))
    : null;

  const stat = (label, value) => h('div.stat', h('b', { text: value }), h('span', { text: label }));

  return { refreshAudio, showStart, showLevelSelect, showPause, showLevelComplete, showGameOver, showGameEnd, hide, get current() { return current; } };
}
