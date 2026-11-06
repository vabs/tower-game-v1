import { TILE_SIZE } from '../core/grid.js';
import { towerStats } from '../sim/towers.js';

const S = TILE_SIZE; // sprites are 24px, drawn at 2x == one tile

const TILE_SPRITE = {
  buildable: 'tiles/buildable',
  blocked: 'tiles/blocked',
  path: 'tiles/path',
  spawn: 'tiles/spawn',
  goal: 'tiles/goal',
};

export function createRenderer(canvas, sprites) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function sprite(name, x, y, w = S, h = S) {
    const img = sprites[name];
    if (img) ctx.drawImage(img, x, y, w, h);
    else {
      ctx.fillStyle = '#f0f';
      ctx.fillRect(x, y, w, h);
    }
  }

  function ring(x, y, rangePx, valid = true) {
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    ctx.fillStyle = valid ? 'rgba(120,220,120,0.14)' : 'rgba(230,80,80,0.16)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = valid ? 'rgba(140,240,140,0.8)' : 'rgba(240,100,100,0.85)';
    ctx.stroke();
  }

  function drawTiles(map) {
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) sprite(TILE_SPRITE[map.tiles[y][x]], x * S, y * S);
    }
  }

  function drawEnemy(e) {
    if (e.air) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 14, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const yOff = e.air ? -8 : 0;
    sprite(`enemies/${e.defId}`, e.x - S / 2, e.y - S / 2 + yOff);
    const w = 32;
    const bx = e.x - w / 2;
    const by = e.y - S / 2 + yOff - 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx - 1, by - 1, w + 2, 6);
    const f = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = f > 0.5 ? '#5ec96a' : f > 0.25 ? '#e0c040' : '#e05050';
    ctx.fillRect(bx, by, w * f, 4);
  }

  /**
   * @param world sim world (read only)
   * @param view {{selectedTowerId:number|null, ghost:{typeId:string,tx:number,ty:number,range:number,valid:boolean}|null}}
   */
  function draw(world, view = {}) {
    ctx.imageSmoothingEnabled = false;
    drawTiles(world.map);

    const sel = view.selectedTowerId != null ? world.towers.find((t) => t.id === view.selectedTowerId) : null;
    if (sel) ring(sel.x, sel.y, towerStats(sel).rangePx, true);

    for (const t of world.towers) sprite(`towers/${t.typeId}_l${t.level}`, t.tx * S, t.ty * S);
    if (sel) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffe27a';
      ctx.strokeRect(sel.tx * S + 1, sel.ty * S + 1, S - 2, S - 2);
    }

    for (const e of world.enemies) drawEnemy(e);

    ctx.fillStyle = '#fff6a8';
    for (const p of world.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const g = view.ghost;
    if (g) {
      const cx = g.tx * S + S / 2;
      const cy = g.ty * S + S / 2;
      ring(cx, cy, g.range * S, g.valid);
      ctx.globalAlpha = 0.7;
      sprite(`towers/${g.typeId}_l1`, g.tx * S, g.ty * S);
      ctx.globalAlpha = 1;
    }
  }

  return { draw };
}
