// UI readability audit: computed font sizes + WCAG contrast of visible text on each screen.
// Usage: node tools/ui-audit.mjs [outDir]   (npm run ui-audit)
// Exits non-zero when: visible text < 13px, visible text contrast < 4.5:1, #app uses < 85% of the viewport
// (max of width%, height%) at any tested size, canvas display scale < 1.0 at 1920x1080, or canvas text < 13px on screen.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.argv[2] || 'ui-audit-out';
mkdirSync(out, { recursive: true });
const MIN_PX = 13, MIN_CR = 4.5, MIN_FILL = 0.85;
const server = await createServer({ server: { port: 5196, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });

const AUDIT = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2],p[3] ?? 1]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const blend = (fg, bg) => [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3])).concat(1);
  function bgOf(el) {
    const layers = [];
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; }
    let bg = [12,15,14,1]; for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg); return bg;
  }
  function opac(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; }
  const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; const txt = t.textContent.trim(); if (!txt) continue;
    const el = t.parentElement; if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    if (el.closest('[hidden]') || el.closest('[inert]')) continue;
    const o = opac(el); const bg = bgOf(el); let fg = parse(cs.color); fg = [fg[0],fg[1],fg[2],fg[3]*o];
    const fgb = blend(fg, bg); const L1 = lum(fgb), L2 = lum(bg);
    const cr = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    rows.push({ text: txt.slice(0, 40), sel: el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.className && typeof el.className === 'string' ? '.'+el.className.split(' ').join('.') : ''), px: parseFloat(cs.fontSize), weight: cs.fontWeight, upper: cs.textTransform === 'uppercase', family: cs.fontFamily.split(',')[0], cr: Math.round(cr*100)/100, opacity: Math.round(o*100)/100 });
  }
  const app = document.getElementById('app')?.getBoundingClientRect();
  const canvas = document.getElementById('game')?.getBoundingClientRect();
  const cv = window.__canvasText || [];
  return { rows, scrollOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1, vw: innerWidth, vh: innerHeight, canvasText: cv.length ? Math.min(...cv) : null, app: app && { w: Math.round(app.width), h: Math.round(app.height) }, canvas: canvas && { w: Math.round(canvas.width), h: Math.round(canvas.height), scale: Math.round(canvas.width/960*100)/100 } };
};

const INIT = () => {
  // record the on-screen pixel size of every canvas text draw call
  const rec = (orig) => function (...a) {
    const m = /(\d+(?:\.\d+)?)px/.exec(this.font);
    if (m && this.canvas.clientWidth) (window.__canvasText ||= []).push(Number(m[1]) * this.canvas.clientWidth / this.canvas.width);
    return orig.apply(this, a);
  };
  CanvasRenderingContext2D.prototype.fillText = rec(CanvasRenderingContext2D.prototype.fillText);
  CanvasRenderingContext2D.prototype.strokeText = rec(CanvasRenderingContext2D.prototype.strokeText);
};

const SIZES = [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440]];
const report = {};
for (const [vw, vh] of SIZES) {
  const full = vw < 2560; // 2560x1440 only checks the in-game layout
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  await page.addInitScript(INIT);
  const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${vw}-${name}.png` }); report[`${vw}x${vh} ${name}`] = await page.evaluate(AUDIT); };
  if (full) {
    await page.goto('http://localhost:5196/'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
    await shot('start');
    await page.getByRole('button', { name: /level select/i }).first().click(); await shot('level-select');
  }
  await page.goto('http://localhost:5196/?level=12'); await page.waitForFunction(() => window.__td?.world);
  await page.evaluate(async () => { const { placeTower } = await import('/src/sim/commands.js'); const w = window.__td.world; w.coins = 5000; const t = placeTower(w, 'ar_turret', 6, 3); if (t.ok) window.__td.app.select(t.tower.id); });
  await shot('in-game-build');
  if (full) {
    await page.keyboard.press('Space'); await page.waitForTimeout(5000); await shot('in-game-wave');
    await page.keyboard.press('Escape'); await shot('pause');
    await page.evaluate(async () => {
      const { getUnlocksForLevel } = await import('/src/data/levels.js'); const { contractFor } = await import('/src/sim/contracts.js');
      const { screens, world } = window.__td; screens.hide();
      screens.showLevelComplete({ world, medal: 'silver', hpLost: 3, improved: true, contract: { ...contractFor(world.level), done: true }, nextUnlocks: getUnlocksForLevel(13).length ? getUnlocksForLevel(13) : getUnlocksForLevel(2) });
    });
    await shot('level-complete');
    await page.evaluate(() => { window.__td.screens.hide(); window.__td.screens.showGameOver(window.__td.world); });
    await shot('game-over');
  }
  await page.close();
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));

// Summary + gates
const failures = [];
for (const [k, v] of Object.entries(report)) {
  const r = v.rows;
  const small = r.filter((x) => x.px < MIN_PX), low = r.filter((x) => x.cr < MIN_CR);
  const sizes = {}; r.forEach((x) => { sizes[x.px] = (sizes[x.px] || 0) + 1; });
  const fill = v.app ? Math.max(v.app.w / v.vw, v.app.h / v.vh) : 0;
  console.log(`\n== ${k}  app=${v.app?.w}x${v.app?.h} (${Math.round(fill * 100)}%) canvas=${JSON.stringify(v.canvas)} canvasText=${v.canvasText === null ? 'n/a' : v.canvasText.toFixed(1) + 'px'}`);
  console.log(`text elems ${r.length} | <${MIN_PX}px: ${small.length} | contrast<${MIN_CR}: ${low.length} | min ${Math.min(...r.map((x) => x.px))}px`);
  console.log('size histogram', JSON.stringify(sizes));
  for (const x of [...small, ...low].slice(0, 8)) console.log(`  ${x.px}px cr=${x.cr} ${x.sel} "${x.text}"`);
  if (small.length) failures.push(`${k}: ${small.length} text elements under ${MIN_PX}px`);
  if (low.length) failures.push(`${k}: ${low.length} text elements under ${MIN_CR}:1 contrast`);
  if (fill < MIN_FILL) failures.push(`${k}: #app fills only ${Math.round(fill * 100)}% of the viewport`);
  if (v.scrollOverflow) failures.push(`${k}: page overflows the viewport`);
  if (v.canvasText !== null && v.canvasText < MIN_PX - 0.01) failures.push(`${k}: canvas text ${v.canvasText.toFixed(1)}px on screen`);
  if (v.vw === 1920 && v.canvas && /in-game/.test(k) && v.canvas.scale < 1) failures.push(`${k}: canvas scale ${v.canvas.scale} < 1.0`);
}
await browser.close(); await server.close();
if (failures.length) { console.log('\nUI AUDIT FAILED'); for (const f of failures) console.log('  - ' + f); process.exit(1); }
console.log('\nUI audit passed');
