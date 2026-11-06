import { TILE_SIZE } from '../core/grid.js';
import { towerStats, towerLevel, dronePosition } from '../sim/towers.js';

const S = TILE_SIZE; // sprites are 24px, drawn at 2x == one tile

const PROPS = ['crates', 'fuel_drums', 'sandbags', 'wreck', 'rubble', 'fence', 'comms_tower'];
const ENEMY_SCALE = 3; // 24px sprite -> 72px canvas (art occupies the middle ~half)
const BOSS_BASE = 36; // boss sprites are 36x36

/** Deterministic integer hash of a tile coordinate (+ salt). */
function hash(x, y, salt = 0) {
  let h = (Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263) + Math.imul(salt + 1, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mapType(map) {
  return map.type ?? String(map.id ?? '').split('_')[0];
}

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

  // ---- static map layer, pre-rendered once per map ----
  const mapCache = new WeakMap();

  function buildMapLayer(map) {
    const c = document.createElement('canvas');
    c.width = map.w * S;
    c.height = map.h * S;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const put = (name, x, y, w = S, h = S) => {
      const img = sprites[name];
      if (img) g.drawImage(img, x, y, w, h);
      else { g.fillStyle = '#f0f'; g.fillRect(x, y, w, h); }
    };
    const open = mapType(map) === 'open';
    const isRoad = (x, y) => {
      const k = map.kind(x, y);
      return k === 'path' || k === 'spawn' || k === 'goal';
    };
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        put(`tiles/ground_${(hash(x, y) % 3) + 1}`, x * S, y * S);
      }
    }
    // road / track
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (map.tiles[y][x] !== 'path' || open) continue;
        const px = x * S;
        const py = y * S;
        g.fillStyle = '#4b4b48';
        g.fillRect(px, py, S, S);
        for (let i = 0; i < 5; i++) {
          const hh = hash(x, y, 20 + i);
          g.fillStyle = hh & 1 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
          g.fillRect(px + 2 + (hh % (S - 6)), py + 2 + ((hh >>> 8) % (S - 6)), 3, 2);
        }
      }
    }
    if (!open) {
      for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
          if (map.tiles[y][x] !== 'path') continue;
          const px = x * S;
          const py = y * S;
          g.fillStyle = '#25251f';
          if (!isRoad(x, y - 1)) g.fillRect(px, py, S, 3);
          if (!isRoad(x, y + 1)) g.fillRect(px, py + S - 3, S, 3);
          if (!isRoad(x - 1, y)) g.fillRect(px, py, 3, S);
          if (!isRoad(x + 1, y)) g.fillRect(px + S - 3, py, 3, S);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          if (!isRoad(x, y - 1)) g.fillRect(px, py + 3, S, 2);
          if (!isRoad(x, y + 1)) g.fillRect(px, py + S - 5, S, 2);
          if (!isRoad(x - 1, y)) g.fillRect(px + 3, py, 2, S);
          if (!isRoad(x + 1, y)) g.fillRect(px + S - 5, py, 2, S);
          g.fillStyle = 'rgba(230,200,90,0.55)';
          const cx = px + S / 2 - 1;
          const cy = py + S / 2 - 1;
          const horiz = isRoad(x - 1, y) || isRoad(x + 1, y);
          const vert = isRoad(x, y - 1) || isRoad(x, y + 1);
          if (horiz) { g.fillRect(px + 6, cy, 8, 2); g.fillRect(px + 30, cy, 8, 2); }
          if (vert) { g.fillRect(cx, py + 6, 2, 8); g.fillRect(cx, py + 30, 2, 8); }
        }
      }
    }
    // blocked: ground + deterministic prop
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (map.tiles[y][x] !== 'blocked') continue;
        g.fillStyle = 'rgba(0,0,0,0.1)';
        g.fillRect(x * S, y * S, S, S);
        put(`props/${PROPS[hash(x, y, 3) % PROPS.length]}`, x * S, y * S);
      }
    }
    // open maps: dashed beacon route + waypoint posts
    if (open) {
      const tp = map.tilePaths ?? [];
      g.save();
      tp.forEach((wps) => {
        g.beginPath();
        wps.forEach((w, i) => {
          const X = w.x * S + S / 2;
          const Y = w.y * S + S / 2;
          if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
        });
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 6;
        g.setLineDash([10, 12]);
        g.stroke();
        g.strokeStyle = 'rgba(255,214,110,0.8)';
        g.lineWidth = 3;
        g.stroke();
      });
      g.restore();
      const seen = new Set();
      tp.forEach((wps) => wps.forEach((w, i) => {
        const k = `${w.x},${w.y}`;
        if (i === 0 || i === wps.length - 1 || seen.has(k)) return;
        seen.add(k);
        put('tiles/waypoint', w.x * S, w.y * S);
      }));
    }
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const k = map.tiles[y][x];
        if (k === 'spawn' || k === 'goal') {
          g.fillStyle = 'rgba(20,20,18,0.55)';
          g.fillRect(x * S, y * S, S, S);
          put(k === 'spawn' ? 'tiles/spawn' : 'tiles/goal', x * S, y * S);
        }
      }
    }
    return c;
  }

  function drawMapLayer(map) {
    let layer = mapCache.get(map);
    if (!layer) { layer = buildMapLayer(map); mapCache.set(map, layer); }
    ctx.drawImage(layer, 0, 0);
  }

  /** Pulsing chevrons at spawns, hazard ring at goal (animated, so not in the cache). */
  function drawMarkers(map, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const seen = new Set();
    for (const wps of map.tilePaths ?? []) {
      const a = wps[0];
      const n = wps[1];
      const k = `${a.x},${a.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const ang = Math.atan2(Math.sign(n.y - a.y), Math.sign(n.x - a.x));
      ctx.save();
      ctx.translate(a.x * S + S / 2, a.y * S + S / 2);
      ctx.rotate(ang);
      for (let i = 0; i < 2; i++) {
        const off = 8 + i * 9 + pulse * 5;
        ctx.globalAlpha = (i ? 0.55 : 0.9) * (0.5 + 0.5 * pulse);
        ctx.strokeStyle = '#9fe0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(off - 5, -9);
        ctx.lineTo(off + 3, 0);
        ctx.lineTo(off - 5, 9);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(map.goal.x * S + S / 2, map.goal.y * S + S / 2);
    ctx.lineWidth = 3;
    const rr = S / 2 + 3 + pulse * 2;
    ctx.strokeStyle = `rgba(255,90,70,${0.6 + 0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 12;
    ctx.strokeStyle = 'rgba(255,220,80,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGhostGrid(g) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const R = 3;
    for (let i = -R; i <= R + 1; i++) {
      const x = (g.tx + i) * S + 0.5;
      const y = (g.ty + i) * S + 0.5;
      ctx.moveTo(x, (g.ty - R) * S);
      ctx.lineTo(x, (g.ty + R + 1) * S);
      ctx.moveTo((g.tx - R) * S, y);
      ctx.lineTo((g.tx + R + 1) * S, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---- short-lived visual effects (real time, purely cosmetic) ----
  /** @type {{kind:string,age:number,dur:number,[k:string]:any}[]} */
  let fx = [];
  let lastT = null;
  let animT = 0;
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

  const lastPos = new Map(); // enemy id -> {x,y,ang,flip}

  function facing(e) {
    let st = lastPos.get(e.id);
    if (!st) { st = { x: e.x, y: e.y, ang: Math.PI / 2, flip: false }; lastPos.set(e.id, st); }
    const dx = e.x - st.x;
    const dy = e.y - st.y;
    if (dx * dx + dy * dy > 0.04) {
      st.ang = Math.atan2(dy, dx);
      if (Math.abs(dx) > 0.02) st.flip = dx < 0;
      st.x = e.x;
      st.y = e.y;
    }
    return st;
  }

  function drawEnemy(e, tNow) {
    const f = facing(e);
    const boss = e.boss && sprites[`bosses/${e.defId}`];
    const key = boss ? `bosses/${e.defId}` : `enemies/${e.defId}`;
    const px = boss ? Math.round(BOSS_BASE * (e.scale ?? 1) * (4 / 3)) : Math.round(24 * ENEMY_SCALE * (e.scale ?? 1));
    const half = px / 2;
    const ex = Math.round(e.x);
    const ey = Math.round(e.y);
    const lift = e.air ? 12 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(ex, ey + (e.air ? half * 0.45 + 6 : half * 0.35), half * (e.air ? 0.5 : 0.55), half * (e.air ? 0.16 : 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
    const cy = ey - lift;
    const img = sprites[key];
    ctx.save();
    ctx.translate(ex, cy);
    if (boss) ctx.rotate(f.ang + Math.PI / 2); // boss art faces up
    else if (f.flip) ctx.scale(-1, 1);
    if (img) ctx.drawImage(img, -half, -half, px, px);
    else { ctx.fillStyle = '#f0f'; ctx.fillRect(-half, -half, px, px); }
    ctx.restore();
    const st = e.status;
    const ox = ex - half;
    const oy = cy - half;
    if (st.slow) { ctx.globalAlpha = 0.65; sprite('fx/slow_overlay', ox, oy, px, px); ctx.globalAlpha = 1; }
    if (st.burn) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(tNow * 18); sprite('fx/burn_overlay', ox, oy, px, px); ctx.globalAlpha = 1; }
    if (st.stun) {
      // EMP: pulsing electric-blue tint plus a flickering spark
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(tNow * 30);
      ctx.fillStyle = '#7fd0ff';
      ctx.beginPath();
      ctx.ellipse(ex, cy, half * 0.62, half * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (Math.floor(tNow * 14) % 2 === 0) sprite('fx/hit_spark', ex - 12, oy - 14, 24, 24);
    }
    if (e.hp < e.maxHp || e.boss) {
      const w = e.boss ? 64 : 32;
      const h = e.boss ? 6 : 4;
      const bx = ex - w / 2;
      const by = Math.round(cy - (boss ? half * 0.8 : 26)) - 6;
      ctx.fillStyle = '#111';
      ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
      const fr = Math.max(0, Math.min(1, e.hp / e.maxHp));
      ctx.fillStyle = fr > 0.5 ? '#5ec96a' : fr > 0.25 ? '#e0c040' : '#e05050';
      ctx.fillRect(bx, by, Math.round(w * fr), h);
      if (st.paint) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(bx, by - 5, 5, 4); }
      if (st.armor) { ctx.fillStyle = '#ffa040'; ctx.fillRect(bx + 7, by - 5, 5, 4); }
    }
  }

  /**
   * @param world sim world (read only)
   * @param view {{selectedTowerId:number|null, ghost:{typeId:string,tx:number,ty:number,range:number,valid:boolean}|null}}
   */
  function draw(world, view = {}) {
    ctx.imageSmoothingEnabled = false;
    const real = performance.now() / 1000;
    const dt = (lastT === null ? 0 : Math.min(0.1, real - lastT)) * (view.speed ?? 1);
    lastT = real;
    animT += dt; // cosmetic clock: fx and marker/burn animation follow game speed
    const now = animT;
    drawMapLayer(world.map);
    drawMarkers(world.map, now);
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

    if (lastPos.size > world.enemies.length + 64) {
      const live = new Set(world.enemies.map((e) => e.id));
      for (const id of lastPos.keys()) if (!live.has(id)) lastPos.delete(id);
    }
    const drawOrder = [...world.enemies].sort((a, b) => (a.air - b.air) || a.y - b.y);
    for (const e of drawOrder) drawEnemy(e, now);
    for (const p of world.projectiles) drawProjectile(p);
    drawFx(dt);

    const g = view.ghost;
    if (g) {
      const cx = g.tx * S + S / 2;
      const cy = g.ty * S + S / 2;
      drawGhostGrid(g);
      ring(cx, cy, g.range * S, g.valid);
      ctx.globalAlpha = 0.7;
      sprite(`towers/${g.typeId}_l1`, g.tx * S, g.ty * S);
      ctx.globalAlpha = 1;
    }
  }

  return { draw, consume };
}
