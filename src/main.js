import './styles/main.css';
import { VERSION } from './core/version.js';
import { createRenderer } from './render/renderer.js';
import { createClock } from './core/time.js';
import { createGame } from './game/game.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const game = createGame({ renderer });

const STEP = 1 / 60;
const clock = createClock(STEP);
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  const steps = clock.advance(dt);
  for (let i = 0; i < steps; i++) game.update(STEP);
  game.render();
  renderer.text(`Tower Defence v${VERSION}`, 24, 52);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
