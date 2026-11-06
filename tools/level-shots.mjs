// Screenshot levels mid-final-wave: node tools/level-shots.mjs <outDir> <level...>
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
const out = process.argv[2]; const lvls = process.argv.slice(3).map(Number);
const server = await createServer({ root: process.cwd(), server: { port: 5198, strictPort: true }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
for (const l of lvls) {
  await p.goto(`http://localhost:5198/?level=${l}`);
  await p.waitForFunction(() => window.__td?.world);
  await p.evaluate(async () => {
    const { step } = await import('/src/sim/world.js'); const { startWave } = await import('/src/sim/commands.js');
    const w = window.__td.world; w.hp = 9999;
    // jump to last wave so bosses / air show
    while (w.waveIndex < w.waves.length - 1) { startWave(w); for (let i=0;i<60*400 && w.phase==='wave';i++) step(w,1/60); }
    startWave(w); for (let i=0;i<60*14;i++) step(w,1/60);
  });
  await p.waitForTimeout(300);
  await p.locator('#game').screenshot({ path: `${out}/level-${l}.png` });
}
console.log('errors:', errs.length ? errs : 'none');
await b.close(); await server.close();
