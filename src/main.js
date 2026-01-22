import { VERSION } from './core/version.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#1d2322';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#c2b280';
ctx.font = '14px monospace';
ctx.fillText(`Tower Defence v${VERSION}`, 24, 28);
