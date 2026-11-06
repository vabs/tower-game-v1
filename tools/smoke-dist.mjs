// Plays the built single-file game straight from disk (file://), the way a user double-clicks it.
// Usage: npm run smoke:dist   (builds first)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
try {
  await page.goto(url);
  await page.getByRole('button', { name: /level select/i }).first().click({ timeout: 5000 });
  check('start screen -> level select', (await page.locator('#screens [data-level="1"]').count()) === 1);
  await page.locator('#screens [data-level="1"]').click();
  await page.waitForTimeout(500);
  const before = await page.locator('#hud-wave').textContent();
  await page.keyboard.press('Space');
  await page.waitForTimeout(3000);
  const btn = await page.locator('#hud-start').textContent();
  check('level 1 starts and wave runs', /progress/i.test(btn), `wave=${before} button=${btn}`);
} catch (e) {
  check('no exception', false, String(e));
} finally {
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
}
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
