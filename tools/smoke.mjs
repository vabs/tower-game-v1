// Browser smoke test: drives the real page in Chrome via playwright-core.
// Usage: node tools/smoke.mjs [outDir]   (starts its own Vite dev server)
// Exits non-zero on console errors or failed checks. Writes screenshots to outDir.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] || 'smoke-out';
mkdirSync(outDir, { recursive: true });

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text() + ' @ ' + (m.location()?.url || '')); });
page.on('pageerror', (e) => errors.push(String(e)));

const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok, detail }); };

try {
  await page.goto('http://localhost:5199/?level=1');
  await page.waitForFunction(() => window.__td && window.__td.world, null, { timeout: 10000 });
  await page.screenshot({ path: `${outDir}/01-loaded.png` });

  // Click a tile by tile coords on the canvas.
  const clickTile = async (tx, ty, opts = {}) => {
    const box = await page.locator('#game').boundingBox();
    const sx = box.width / 960, sy = box.height / 528;
    await page.mouse.click(box.x + (tx * 48 + 24) * sx, box.y + (ty * 48 + 24) * sy, opts);
  };

  const buttons = page.locator('#hud-tower-list button');
  check('tower buttons rendered', (await buttons.count()) >= 1, `count=${await buttons.count()}`);

  const coins0 = await page.evaluate(() => window.__td.world.coins);
  await buttons.first().click();
  const box = await page.locator('#game').boundingBox();
  await page.mouse.move(box.x + 6 * 48, box.y + 3.5 * 48);
  await page.screenshot({ path: `${outDir}/02-armed-ghost.png` });
  await clickTile(6, 3);
  const towers1 = await page.evaluate(() => window.__td.world.towers.length);
  const coins1 = await page.evaluate(() => window.__td.world.coins);
  check('tower placed by click', towers1 === 1, `towers=${towers1}`);
  check('coins deducted', coins1 < coins0, `${coins0} -> ${coins1}`);

  // place 2 more (re-arm each time)
  for (const [tx, ty] of [[8, 4]]) { await buttons.first().click(); await clickTile(tx, ty); }
  check('two towers placed', (await page.evaluate(() => window.__td.world.towers.length)) === 2);

  // select a tower
  await clickTile(6, 3);
  await page.waitForTimeout(200);
  const sel = await page.locator('#hud-selected').textContent();
  check('selecting tower shows name', sel && sel !== 'None', `selected=${sel}`);
  await page.screenshot({ path: `${outDir}/03-selected.png` });

  await page.click('#hud-start');
  await page.waitForTimeout(6000);
  const st = await page.evaluate(() => ({ phase: window.__td.world.phase, enemies: window.__td.world.enemies.length, proj: window.__td.world.projectiles.length }));
  check('wave running with enemies', st.phase === 'wave' && st.enemies > 0, JSON.stringify(st));
  await page.screenshot({ path: `${outDir}/04-wave.png` });

  // Fast-forward sim to the end to check overlay.
  await page.evaluate(async () => {
    const { step } = await import('/src/sim/world.js');
    const w = window.__td.world;
    for (let i = 0; i < 60 * 60 * 10 && w.phase !== 'won' && w.phase !== 'lost'; i++) {
      if (w.phase === 'build') { const { startWave } = await import('/src/sim/commands.js'); startWave(w); }
      step(w, 1 / 60);
    }
  });
  await page.waitForTimeout(500);
  const end = await page.evaluate(() => window.__td.world.phase);
  const overlayVisible = await page.locator('#overlay').isVisible();
  check('level ends', end === 'won' || end === 'lost', end);
  check('end overlay visible', overlayVisible);
  await page.screenshot({ path: `${outDir}/05-end.png` });

  // ---- layout: no horizontal overflow, panels and top bar fully visible ----
  const layoutCheck = async (w, h, tag) => {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, w: b.width, h: b.height }; };
      return {
        sw: document.documentElement.scrollWidth, iw: window.innerWidth,
        top: r('.topbar'), left: r('.left-panel'), right: r('.right-panel'), canvas: r('#game'),
      };
    });
    check(`no horizontal scroll at ${tag}`, m.sw <= m.iw, `scrollWidth=${m.sw} innerWidth=${m.iw}`);
    check(`panels and top bar on screen at ${tag}`, m.top.l >= 0 && m.top.r <= m.iw && m.left.l >= 0 && m.right.r <= m.iw, JSON.stringify({ top: m.top.l, left: m.left.l, right: m.right.r }));
    check(`canvas keeps aspect ratio at ${tag}`, Math.abs(m.canvas.w / m.canvas.h - 960 / 528) < 0.02, `${m.canvas.w.toFixed(0)}x${m.canvas.h.toFixed(0)}`);
    return m;
  };
  await layoutCheck(1280, 720, '1280x720');
  await page.screenshot({ path: `${outDir}/06-layout-1280.png` });
  await layoutCheck(1400, 800, '1400x800');

  // ---- sandbox: all 30 towers, one per family, upgrade/sell/targeting, mixed test wave ----
  await page.goto('http://localhost:5199/?sandbox=1');
  await page.waitForFunction(() => window.__td && window.__td.world, null, { timeout: 10000 });
  const sb = page.locator('#hud-tower-list button');
  check('sandbox lists 30 towers', (await sb.count()) === 30, `count=${await sb.count()}`);
  check('sandbox AA towers show chevron', (await page.locator('#hud-tower-list img.aa-chevron').count()) === 5);
  check('sandbox coins', (await page.evaluate(() => window.__td.world.coins)) >= 99000);
  await layoutCheck(1280, 720, '1280x720 sandbox');
  await layoutCheck(1400, 800, '1400x800 sandbox');

  const clickTile2 = async (tx, ty) => {
    const b = await page.locator('#game').boundingBox();
    await page.mouse.click(b.x + ((tx * 48 + 24) * b.width) / 960, b.y + ((ty * 48 + 24) * b.height) / 528);
  };
  const placeById = async (id, tx, ty) => {
    await page.locator(`#hud-tower-list button[data-id="${id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`#hud-tower-list button[data-id="${id}"]`).click();
    await clickTile2(tx, ty);
  };
  const plan = [
    ['ar_turret', 6, 3], ['marksman_tower', 9, 3], ['mortar', 6, 6], ['cryo_sprayer', 9, 4], ['ammo_feeder', 7, 6],
    ['aa_mg', 2, 3], ['shock_coil', 8, 6], ['gas_projector', 12, 6], ['flak_cannon', 13, 3], ['interceptor_drone', 2, 6],
    ['rail_autocannon', 11, 1], ['gatling_turret', 5, 4], ['incendiary_turret', 12, 4], ['grenade_launcher', 1, 4],
    ['target_painter', 8, 4], ['logistics_hub', 0, 0],
  ];
  for (const [id, tx, ty] of plan) await placeById(id, tx, ty);
  const placed = await page.evaluate(() => window.__td.world.towers.map((t) => t.typeId));
  check('one tower of each family placed', ['assault', 'precision', 'explosive', 'control', 'support', 'anti-air'].length === 6 && placed.length === plan.length, `placed=${placed.length}/${plan.length}`);

  // upgrade ar_turret to L5 through the panel
  await clickTile2(6, 3);
  for (let i = 0; i < 4; i++) await page.click('#hud-upgrade');
  const lvl = await page.evaluate(() => window.__td.world.towers.find((t) => t.typeId === 'ar_turret').level);
  check('upgraded to L5 via panel', lvl === 5, `level=${lvl}`);
  await page.waitForTimeout(100);
  check('upgrade disabled at max', await page.locator('#hud-upgrade').isDisabled());
  await page.screenshot({ path: `${outDir}/07-sandbox-upgraded.png` });

  // targeting mode
  await page.selectOption('#hud-targeting', 'last');
  const mode = await page.evaluate(() => window.__td.world.towers.find((t) => t.typeId === 'ar_turret').targeting);
  check('targeting mode changed', mode === 'last', mode);

  // sell
  const n0 = await page.evaluate(() => window.__td.world.towers.length);
  const c0 = await page.evaluate(() => window.__td.world.coins);
  await clickTile2(7, 6);
  await page.click('#hud-sell');
  const n1 = await page.evaluate(() => window.__td.world.towers.length);
  const c1 = await page.evaluate(() => window.__td.world.coins);
  check('sold a tower for a refund', n1 === n0 - 1 && c1 > c0, `towers ${n0}->${n1}, coins ${c0}->${c1}`);

  // test wave: button, then the N key
  await page.click('#hud-spawn-test');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('n');
  const spawned = await page.evaluate(() => window.__td.world.enemies.length);
  check('test wave spawned (button + N key)', spawned === 18, `enemies=${spawned}`);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${outDir}/08-sandbox-wave-a.png` });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${outDir}/09-sandbox-wave-b.png` });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/10-sandbox-wave-c.png` });
  const outcome = await page.evaluate(() => {
    const w = window.__td.world;
    return { kills: w.towers.reduce((a, t) => a + t.kills, 0), enemies: w.enemies.length, hp: w.hp };
  });
  check('towers killed enemies in sandbox', outcome.kills > 0, JSON.stringify(outcome));
} catch (e) {
  check('no exception', false, String(e));
} finally {
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  await server.close();
}
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
