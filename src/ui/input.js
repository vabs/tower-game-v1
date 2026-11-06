import { TILE_SIZE } from '../core/grid.js';
import { routeKey } from './hotkeys.js';

/**
 * Canvas mouse + keyboard -> app intents.
 * Escape is routed to app.escape() (cancel placement first, then pause).
 * app: { world, spawnTest? (sandbox only), hover, arm(id|null), select(id|null), clickTile(tx,ty,shiftKey), towerAt(tx,ty) }
 */
export function attachInput(canvas, app) {
  function tileOf(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left - canvas.clientLeft) * canvas.width) / canvas.clientWidth;
    const y = ((e.clientY - rect.top - canvas.clientTop) * canvas.height) / canvas.clientHeight;
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    const { w, h } = app.world.map;
    return tx >= 0 && ty >= 0 && tx < w && ty < h ? { tx, ty } : null;
  }

  canvas.addEventListener('mousemove', (e) => { app.hover = tileOf(e); });
  canvas.addEventListener('mouseleave', () => { app.hover = null; });
  canvas.addEventListener('click', (e) => {
    const t = tileOf(e);
    if (t) app.clickTile(t.tx, t.ty, e.shiftKey);
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    app.arm(null);
  });
  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    const action = routeKey(e, { screen: app.screen?.() ?? 'playing', sandbox: !!app.spawnTest });
    if (!action) return;
    if (action.type !== 'escape' || e.key === 'Tab') e.preventDefault();
    app.handleAction(action);
  });
  // Space must not also "click" a focused button on key release.
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && e.target?.tagName === 'BUTTON' && (app.screen?.() ?? 'playing') === 'playing') e.preventDefault();
  });
}
