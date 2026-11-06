import { TILE_SIZE } from '../core/grid.js';

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
    if ((e.key === 'n' || e.key === 'N') && app.spawnTest) app.spawnTest();
    if (e.key === 'Escape') app.escape();
  });
}
