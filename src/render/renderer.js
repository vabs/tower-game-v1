import { TILE_SIZE } from '../core/grid.js';
import { towerStats, towerLevel, dronePosition } from '../sim/towers.js';

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

  // ---- short-lived visual effects (real time, purely cosmetic) ----
  /** @type {{kind:string,age:number,dur:number,[k:string]:any}[]} */
  let fx = [];
  let lastT = null;
  const FX_CAP = 120;

  /** Turn sim events into effects. Call once per frame before the events are cleared. */
  function consume(events) {
    for (const ev of events) {
      if (fx.length > FX_CAP) break;
      if (ev.type === 'hit') fx.push({ kind: 'spark', x: ev.x, y: ev.y, age: 0, dur: 0.16 });
      else if (ev.type === 'splash') fx.push({ kind: 'explosion', x: ev.x, y: ev.y, r: ev.radius, age: 0, dur: 0.38 });
      else if (ev.type === 'chain') fx.push({ kind: 'chain', points: ev.points, age: 0, dur: 0.2 });
      else if (ev.type === 'beam') fx.push({ kind: 'beam', ...ev, age: 0, dur: 0.12 });
    }
  }

  function drawFx(dt) {
    for (const f of fx) f.age += dt;
    fx = fx.filter((f) => f.age < f.dur);
    for (const f of fx) {
      const t = f.age / f.dur;
      if (f.kind === 'spark') {
        ctx.globalAlpha = 1 - t;
        sprite('fx/hit_spark', f.x - 12, f.y - 12, 24, 24);
      } else if (f.kind === 'explosion') {
        const d = Math.max(30, f.r * 1.0);
        const frame = Math.min(3, 1 + Math.floor(t * 3));
        ctx.globalAlpha = 0.8 * (1 - t * 0.6);
        sprite(`fx/explosion_${frame}`, f.x - d / 2, f.y - d / 2, d, d);
        const rd = f.r * 2 * (0.5 + 0.5 * t);
        ctx.globalAlpha = 0.5 * (1 - t);
        sprite('fx/splash_ring', f.x - rd / 2, f.y - rd / 2, rd, rd);
      } else if (f.kind === 'chain') {
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#bfe8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        f.points.forEach((p, i) => {
          if (i === 0) { ctx.moveTo(p.x, p.y); return; }
          const q = f.points[i - 1];
          const mx = (p.x + q.x) / 2 + ((p.y - q.y) * 0.12) * (i % 2 ? 1 : -1);
          const my = (p.y + q.y) / 2 - ((p.x - q.x) * 0.12) * (i % 2 ? 1 : -1);
          ctx.lineTo(mx, my);
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (f.kind === 'beam') {
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#9fe8ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawField(f) {
    const d = f.radius * 2;
    ctx.globalAlpha = 0.5 * Math.min(1, f.remaining / 0.5);
    sprite('fx/gas_cloud', f.x - f.radius, f.y - f.radius, d, d);
    ctx.globalAlpha = 1;
  }

  function drawProjectile(p) {
    const img = sprites[`projectiles/${p.kind}`];
    let y = p.y;
    if (p.arc) {
      // shadow on the ground, shell lofted along a parabola
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      y -= Math.sin(Math.PI * p.progress) * 46;
    }
    if (!img) {
      ctx.fillStyle = '#fff6a8';
      ctx.fillRect(p.x - 2, y - 2, 4, 4);
      return;
    }
    const sc = 1.5;
    const w = img.width * sc;
    const h = img.height * sc;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.rotate(p.arc ? 0 : p.angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawDrone(world, t) {
    const d = dronePosition(world, t);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 12, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(d.x - 5, d.y - 2, 10, 4);
    ctx.fillStyle = '#7fd8ff';
    ctx.fillRect(d.x - 2, d.y - 3, 4, 6);
    ctx.fillStyle = '#c8d4dc';
    ctx.fillRect(d.x - 7, d.y - 3, 4, 1);
    ctx.fillRect(d.x + 3, d.y - 3, 4, 1);
  }

  function drawEnemy(e, tNow) {
    if (e.air) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 14, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const yOff = e.air ? -8 : 0;
    sprite(`enemies/${e.defId}`, e.x - S / 2, e.y - S / 2 + yOff);
    const st = e.status;
    if (st.slow) { ctx.globalAlpha = 0.65; sprite('fx/slow_overlay', e.x - S / 2, e.y - S / 2 + yOff); ctx.globalAlpha = 1; }
    if (st.burn) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(tNow * 18); sprite('fx/burn_overlay', e.x - S / 2, e.y - S / 2 + yOff); ctx.globalAlpha = 1; }
    if (st.stun && Math.floor(tNow * 14) % 2 === 0) sprite('fx/hit_spark', e.x - 12, e.y - S / 2 + yOff - 16, 24, 24);
    const w = 32;
    const bx = e.x - w / 2;
    const by = e.y - S / 2 + yOff - 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx - 1, by - 1, w + 2, 6);
    const f = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = f > 0.5 ? '#5ec96a' : f > 0.25 ? '#e0c040' : '#e05050';
    ctx.fillRect(bx, by, w * f, 4);
    if (st.paint) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(bx, by - 5, 5, 4); }
    if (st.armor) { ctx.fillStyle = '#ffa040'; ctx.fillRect(bx + 7, by - 5, 5, 4); }
  }

  /**
   * @param world sim world (read only)
   * @param view {{selectedTowerId:number|null, ghost:{typeId:string,tx:number,ty:number,range:number,valid:boolean}|null}}
   */
  function draw(world, view = {}) {
    ctx.imageSmoothingEnabled = false;
    const now = performance.now() / 1000;
    const dt = lastT === null ? 0 : Math.min(0.1, now - lastT);
    lastT = now;
    drawTiles(world.map);
    for (const f of world.fields ?? []) drawField(f);

    const sel = view.selectedTowerId != null ? world.towers.find((t) => t.id === view.selectedTowerId) : null;
    if (sel) {
      const st = towerStats(sel);
      if (st.rangePx > 0) ring(sel.x, sel.y, st.rangePx, true);
      const lv = towerLevel(sel);
      if (lv.fireRateBoost || lv.rangeBoost) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(120,190,255,0.9)';
        ctx.beginPath();
        ctx.arc(sel.x, sel.y, (lv.auraRange ?? lv.range) * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const t of world.towers) {
      sprite(`towers/${t.typeId}_l${t.level}`, t.tx * S, t.ty * S);
      if (t.typeId === 'interceptor_drone') drawDrone(world, t);
    }
    if (sel) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffe27a';
      ctx.strokeRect(sel.tx * S + 1, sel.ty * S + 1, S - 2, S - 2);
    }

    for (const e of world.enemies) drawEnemy(e, now);
    for (const p of world.projectiles) drawProjectile(p);
    drawFx(dt);

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

  return { draw, consume };
}
