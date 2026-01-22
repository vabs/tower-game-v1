import { VERSION } from './core/version.js';
import { createRenderer } from './render/renderer.js';
import { createGame } from './game/game.js';
import { initHud } from './ui/hud.js';

const app = document.getElementById('app');
const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const game = createGame({ renderer });

initHud(app);

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  game.render();
  renderer.text(`Tower Defence v${VERSION}`, 24, 52);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
