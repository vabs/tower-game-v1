import './styles/main.css';
import { loadSprites } from './render/sprites.js';
import { createRenderer } from './render/renderer.js';
import { createClock } from './core/time.js';
import { createWorld, step, STEP } from './sim/world.js';
import { startWave } from './sim/commands.js';

async function boot() {
  const sprites = await loadSprites();
  const canvas = document.getElementById('game');
  const renderer = createRenderer(canvas, sprites);
  const world = createWorld(1, { seed: Date.now() >>> 0 });
  startWave(world);
  const clock = createClock(STEP);
  let last = performance.now();
  function loop(now) {
    const steps = clock.advance((now - last) / 1000);
    last = now;
    for (let i = 0; i < steps; i++) step(world, STEP);
    world.events.length = 0;
    renderer.draw(world, {});
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
boot();
