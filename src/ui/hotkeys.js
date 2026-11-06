/** Pure keyboard mapping and helpers (no DOM, no sim mutation). */

export const SELL_CONFIRM_MS = 1500;

export const CONTROLS = [
  ['Click tower button, then tile', 'Place a tower (Shift+click keeps it armed)'],
  ['Click a placed tower', 'Select it'],
  ['Right click', 'Cancel placement'],
  ['Space', 'Start the next wave / call it early'],
  ['U', 'Upgrade selected tower'],
  ['S or Delete', 'Sell selected (press twice within 1.5 s during a wave)'],
  ['T', 'Cycle targeting of selected tower'],
  ['Tab', 'Select next tower'],
  ['1 / 2 / 3', 'Game speed 1x / 2x / 3x'],
  ['Esc', 'Cancel placement, otherwise pause / resume'],
];

/**
 * Map a keydown to an intent.
 * @param {{key:string,ctrlKey?:boolean,metaKey?:boolean,altKey?:boolean}} e
 * @param {{screen:string, sandbox?:boolean}} ctx  screen = state-machine state
 * @returns {null|{type:string,[k:string]:any}}
 */
export function routeKey(e, ctx) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const k = e.key;
  if (k === 'Escape') return { type: 'escape' };
  if (ctx.screen !== 'playing') return null;
  switch (k) {
    case ' ': case 'Spacebar': return { type: 'startWave' };
    case 'u': case 'U': return { type: 'upgrade' };
    case 's': case 'S': case 'Delete': return { type: 'sell' };
    case 't': case 'T': return { type: 'cycleTarget' };
    case 'Tab': return { type: 'selectNext', reverse: !!e.shiftKey };
    case '1': case '2': case '3': return { type: 'speed', value: Number(k) };
    case 'n': case 'N': return ctx.sandbox ? { type: 'spawnTest' } : null;
    default: return null;
  }
}

/** Two-press sell during a wave. Returns whether to sell now and the next pending state. */
export function sellDecision(pending, towerId, now, inWave, windowMs = SELL_CONFIRM_MS) {
  if (!inWave) return { sell: true, pending: null };
  if (pending && pending.id === towerId && now - pending.at <= windowMs) return { sell: true, pending: null };
  return { sell: false, pending: { id: towerId, at: now } };
}

/** Targeting modes a tower offers, in cycling order. */
export function targetModesFor(tower) {
  const m = ['first', 'last', 'closest', 'strongest'];
  if (tower.def.family === 'anti-air') m.push('air');
  return m;
}

export function nextTargeting(tower) {
  const modes = targetModesFor(tower);
  const i = modes.indexOf(tower.targeting);
  return modes[(i + 1) % modes.length];
}

/** Next tower id after `selectedId` in placement order (wraps; first when nothing selected). */
export function nextTowerId(towers, selectedId, reverse = false) {
  if (!towers.length) return null;
  const ids = towers.map((t) => t.id).sort((a, b) => a - b);
  const i = ids.indexOf(selectedId);
  if (i < 0) return reverse ? ids[ids.length - 1] : ids[0];
  return ids[(i + (reverse ? ids.length - 1 : 1)) % ids.length];
}
