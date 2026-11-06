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
} catch (e) {
  check('no exception', false, String(e));
} finally {
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  await server.close();
}
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
