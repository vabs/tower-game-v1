// Greedy balance bot (plain node, deterministic per seed). Uses only the public sim commands.
//
// Model: every route (ground paths and straight air lines) is sampled every half tile. For the
// upcoming demand (live enemies + unspawned queue + next wave + a lookahead boss wave) each sample
// gets an HP flux R (HP "owed" on that stretch of route) and an enemy exposure time T. A tower
// covering a sample adds capacity dps * T (* slow/vulnerability/splash modifiers). The bot buys the
// placement or upgrade with the best marginal useful capacity per coin, where useful capacity is
// capped at margin * R per sample (plus a small uncapped tail so spare coins still get spent).
import { createWorld, step, STEP } from '../src/sim/world.js';
import { placeTower, upgradeTower, startWave, upgradeCostOf } from '../src/sim/commands.js';
import { towers } from '../src/data/towers.js';
import { enemies } from '../src/data/enemies.js';
import { bosses } from '../src/data/bosses.js';
import { levelScaling } from '../src/data/waves.js';
import { buildSpawnQueue } from '../src/sim/spawner.js';
import { TILE_SIZE } from '../src/core/grid.js';
import { positionAt, pathLength } from '../src/core/path.js';

const DEFS = new Map([...enemies, ...bosses].map((d) => [d.id, d]));
const TOWER_DEFS = new Map(towers.map((d) => [d.id, d]));
const SAMPLE = TILE_SIZE / 2;
const PX_PER_SPEED = 1.5 * TILE_SIZE;
const MARGIN = 1.5; // wanted capacity relative to incoming HP flux
const TAIL = 0.08; // value of capacity beyond the margin
const FUTURE_WEIGHT = 0.3; // demand weight of waves beyond the next two
const REASSESS = 2; // sim seconds between in-wave decisions
const SKIP_HUB = new Set(['logistics_hub']);
const MODIFIERS = new Set(['cryo_sprayer', 'gas_projector', 'emp_node', 'target_painter', 'armor_breaker', 'ammo_feeder', 'command_uplink']);
const MAX_TIME = 1500; // sim seconds before a run is declared stuck

function airLine(path) {
  return [path[0], path[path.length - 1]];
}

/** Build the half-tile samples of every ground route and air line. */
function buildSamples(map) {
  const xs = [];
  const ys = [];
  const air = [];
  const path = [];
  const s = [];
  const len = { ground: [], air: [] };
  map.paths.forEach((p, pi) => {
    const lg = pathLength(p);
    const la = pathLength(airLine(p));
    len.ground[pi] = lg;
    len.air[pi] = la;
    for (const isAir of [false, true]) {
      const pts = isAir ? airLine(p) : p;
      const L = isAir ? la : lg;
      for (let d = SAMPLE / 2; d < L; d += SAMPLE) {
        const q = positionAt(pts, d);
        xs.push(q.x); ys.push(q.y); air.push(isAir); path.push(pi); s.push(d);
      }
    }
  });
  return { n: xs.length, xs, ys, air, path, s, len };
}

function pathShares(map) {
  const n = map.paths.length;
  if (n === 1 || map.pick === 'first') return map.paths.map((_, i) => (i === 0 ? 1 : 0));
  return map.paths.map(() => 1 / n);
}

/** Per-tile list of sample indices sorted by distance, for fast range queries. */
function buildTileIndex(world, S) {
  const tiles = [];
  for (let ty = 0; ty < world.map.h; ty++) {
    for (let tx = 0; tx < world.map.w; tx++) {
      if (!world.map.buildable(tx, ty)) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      const order = [];
      for (let i = 0; i < S.n; i++) {
        const d = Math.hypot(S.xs[i] - x, S.ys[i] - y);
        if (d <= 8.5 * TILE_SIZE) order.push([d, i]);
      }
      if (!order.length) continue;
      order.sort((a, b) => a[0] - b[0]);
      tiles.push({ tx, ty, x, y, idx: Int32Array.from(order.map((o) => o[1])), dist: Float64Array.from(order.map((o) => o[0])) });
    }
  }
  return tiles;
}

const lvOf = (tower) => tower.def.levels[tower.level - 1];

/** Demand arrays from the world: what still has to be killed on each stretch of route. */
function buildDemand(world, S) {
  const scale = levelScaling(world.level);
  const R = new Float64Array(S.n);
  const TW = new Float64Array(S.n);
  const DW = new Float64Array(S.n);
  const shares = pathShares(world.map);
  const add = (defId, hp, count, pathIdx, d0, weight = 1) => {
    const def = DEFS.get(defId);
    const isAir = def.type === 'air';
    const L = isAir ? S.len.air[pathIdx] : S.len.ground[pathIdx];
    if (d0 >= L) return;
    const speed = def.speed * scale.speed * PX_PER_SPEED;
    const t = SAMPLE / speed;
    const share = (hp * count * weight * SAMPLE) / (L - d0);
    return { isAir, share, t, interval: 0, speed };
  };
  const put = (info, pathIdx, d0, dens) => {
    if (!info) return;
    for (let i = 0; i < S.n; i++) {
      if (S.path[i] !== pathIdx || S.air[i] !== info.isAir || S.s[i] < d0) continue;
      R[i] += info.share;
      TW[i] += info.share * info.t;
      DW[i] += info.share * dens;
    }
  };
  const groupDensity = (interval, speed) => 1 / Math.max(0.2, interval * speed / TILE_SIZE); // enemies per tile
  const addGroup = (g, weight) => {
    const def = DEFS.get(g.id);
    const hp = def.hp * scale.hp * (def.boss ? scale.boss : 1);
    shares.forEach((sh, pi) => {
      if (!sh) return;
      const info = add(g.id, hp, g.count * sh, pi, 0, weight);
      put(info, pi, 0, groupDensity(g.interval, def.speed * scale.speed * PX_PER_SPEED));
    });
  };

  // live enemies
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    const info = add(e.defId, e.hp, 1, e.pathIndex, e.distance);
    put(info, e.pathIndex, e.distance, 0.6);
  }
  // unspawned remainder of the running wave
  if (world.phase === 'wave' && world.spawner) {
    const left = new Map();
    for (let k = world.spawner.next; k < world.spawner.queue.length; k++) {
      const id = world.spawner.queue[k].id;
      left.set(id, (left.get(id) ?? 0) + 1);
    }
    const wave = world.waves[world.waveIndex];
    for (const [id, count] of left) {
      const g = wave.enemies.find((x) => x.id === id);
      addGroup({ id, count, interval: g?.interval ?? 1 }, 1);
    }
  }
  // upcoming waves: next two combat waves, plus a boss wave within 3 combat waves
  const first = world.phase === 'wave' ? world.waveIndex + 1 : world.waveIndex;
  let combat = 0;
  for (let w = first; w < world.waves.length; w++) {
    const wave = world.waves[w];
    if (wave.supply) continue;
    const hasBoss = wave.enemies.some((g) => DEFS.get(g.id).boss);
    // later waves count a little, so e.g. the first air raid is prepared for before it is next
    const weight = combat < 2 || (hasBoss && combat < 3) ? 1 : FUTURE_WEIGHT;
    for (const g of wave.enemies) addGroup(g, weight);
    combat++;
  }
  const T = new Float64Array(S.n);
  const D = new Float64Array(S.n);
  for (let i = 0; i < S.n; i++) {
    if (R[i] > 0) { T[i] = TW[i] / R[i]; D[i] = DW[i] / R[i]; }
  }
  return { R, T, D };
}

const splashFactor = (radiusTiles, density) => {
  const occupancy = Math.max(1, 2 * radiusTiles * density);
  return Math.min(4, 1 + (occupancy - 1) * 0.6);
};

/** Expected useful dps of a tower level against one sample (before slow/vulnerability multipliers). */
function dpsAt(def, lv, rateMult, isAir, density) {
  const aa = def.family === 'anti-air';
  if (isAir && !aa) return 0;
  let dps = (lv.damage ?? 0) * (lv.rate ?? 0) * rateMult * (1 + (lv.crit ?? 0));
  if (aa) dps *= isAir ? 1 + (lv.airBonus ?? 0) : 0.6;
  if (lv.splash) dps *= splashFactor(lv.splash, density);
  if (lv.pierce) dps *= 1 + 0.4 * (lv.pierce - 1);
  if (lv.chains) dps *= 1 + 0.6 * (lv.chains - 1);
  if (lv.fieldRadius && !isAir) dps *= splashFactor(lv.fieldRadius, density);
  if (lv.burnDps) dps += lv.burnDps * Math.min(1, lv.burnDuration * lv.rate * rateMult) * 0.8;
  if (def.id === 'mortar' || def.id === 'howitzer') dps *= 0.75;
  if (def.special?.spoolUp) dps *= 0.85;
  return dps;
}

/** Full evaluation of a tower list (auras, slow, vulnerability, capacity). */
function evaluate(list, S, dem, tileIdx) {
  const n = S.n;
  const C = new Float64Array(n);
  const slowKeep = new Float64Array(n).fill(1);
  const paint = new Float64Array(n);
  const armor = new Float64Array(n);
  const auras = list.map((t) => {
    let fr = 0;
    let rg = 0;
    for (const o of list) {
      if (o === t) continue;
      const lo = o.lv;
      if (!(lo.fireRateBoost || lo.rangeBoost)) continue;
      if (Math.hypot(o.x - t.x, o.y - t.y) > (lo.auraRange ?? lo.range ?? 0) * TILE_SIZE) continue;
      fr = Math.max(fr, lo.fireRateBoost ?? 0);
      rg = Math.max(rg, lo.rangeBoost ?? 0);
    }
    return { fr, rg };
  });
  const cover = list.map((t, k) => {
    const rangePx = (t.lv.range ?? 0) * (1 + auras[k].rg) * TILE_SIZE;
    const ti = tileIdx.get(t.key);
    const out = [];
    if (!ti || rangePx <= 0) return out;
    for (let j = 0; j < ti.idx.length && ti.dist[j] <= rangePx; j++) out.push(ti.idx[j]);
    return out;
  });
  // control and support first (they modify everybody else)
  list.forEach((t, k) => {
    const lv = t.lv;
    const rate = (lv.rate ?? 0) * (1 + auras[k].fr);
    const slow = lv.slow ?? lv.fieldSlow ?? 0;
    const stunFrac = lv.stun ? Math.min(0.7, lv.stun * rate) : 0;
    if (!slow && !stunFrac && !lv.damageBoost && !lv.armorDebuff) return;
    for (const i of cover[k]) {
      if (S.air[i] && lv.fieldSlow) continue;
      const keep = (1 - slow) * (1 - stunFrac);
      if (keep < slowKeep[i]) slowKeep[i] = keep;
      if (lv.damageBoost && lv.damageBoost > paint[i]) paint[i] = lv.damageBoost;
      if (lv.armorDebuff && lv.armorDebuff > armor[i]) armor[i] = lv.armorDebuff;
    }
  });
  list.forEach((t, k) => {
    const rateMult = 1 + auras[k].fr;
    for (const i of cover[k]) {
      const dps = dpsAt(t.def, t.lv, rateMult, S.air[i], dem.D[i]);
      if (dps <= 0) continue;
      C[i] += dps * dem.T[i] * Math.min(3, 1 / slowKeep[i]) * (1 + paint[i] + armor[i]);
    }
  });
  return { C, slowKeep, paint, armor };
}

/** Per-sample weight: weakest channel (ground path or air line) first, so no route is left open. */
function channelWeights(C, dem, S) {
  const key = (i) => (S.air[i] ? 1000 : 0) + S.path[i];
  const cap = new Map();
  const need = new Map();
  for (let i = 0; i < S.n; i++) {
    if (dem.R[i] <= 0) continue;
    const k = key(i);
    cap.set(k, (cap.get(k) ?? 0) + C[i]);
    need.set(k, (need.get(k) ?? 0) + dem.R[i]);
  }
  const W = new Float64Array(S.n);
  for (let i = 0; i < S.n; i++) {
    if (dem.R[i] <= 0) continue;
    const ratio = cap.get(key(i)) / need.get(key(i));
    W[i] = 1 / (0.25 + ratio);
  }
  return W;
}

function value(C, dem, W, S) {
  let v = 0;
  for (let i = 0; i < S.n; i++) {
    if (dem.R[i] <= 0) continue;
    const c = C[i];
    v += (Math.min(c, dem.R[i] * MARGIN) + TAIL * c) * W[i];
  }
  return v;
}

/** Run the bot on one level/seed. */
export function runBot(level, seed, { verbose = false } = {}) {
  const world = createWorld(level, { seed });
  const S = buildSamples(world.map);
  const tiles = buildTileIndex(world, S);
  const tileIdx = new Map(tiles.map((t) => [`${t.tx},${t.ty}`, t]));
  // modifier candidates: tiles with the most route samples nearby
  const covCount = (t) => { let n = 0; while (n < t.dist.length && t.dist[n] <= 4.5 * TILE_SIZE) n++; return n; };
  const hot = [...tiles].sort((a, b) => covCount(b) - covCount(a)).slice(0, 10);
  const unlocked = world.unlocked.map((id) => TOWER_DEFS.get(id)).filter((d) => d && !SKIP_HUB.has(d.id));
  const plain = unlocked.filter((d) => !MODIFIERS.has(d.id));
  const mods = unlocked.filter((d) => MODIFIERS.has(d.id));
  const cheapest = Math.min(...unlocked.map((d) => d.levels[0].cost));

  let dem = buildDemand(world, S);

  const asList = () => world.towers.map((t) => ({ def: t.def, lv: lvOf(t), x: t.x, y: t.y, key: `${t.tx},${t.ty}`, tower: t }));

  function decideOnce() {
    const list = asList();
    const base = evaluate(list, S, dem, tileIdx);
    const W = channelWeights(base.C, dem, S);
    const baseVal = value(base.C, dem, W, S);
    const room = new Float64Array(S.n);
    for (let i = 0; i < S.n; i++) room[i] = dem.R[i] * MARGIN - base.C[i];
    const occupied = new Set(world.towers.map((t) => `${t.tx},${t.ty}`));
    let best = null;
    const consider = (score, act) => { if (score > 0 && (!best || score > best.score)) best = { score, ...act }; };

    // incremental gain for non-modifier towers: placement or upgrade
    const gainPlain = (def, lv, ti, oldLv, auraFr, auraRg) => {
      const rangePx = (lv.range ?? 0) * (1 + auraRg) * TILE_SIZE;
      let g = 0;
      for (let j = 0; j < ti.idx.length && ti.dist[j] <= rangePx; j++) {
        const i = ti.idx[j];
        if (dem.R[i] <= 0) continue;
        let add = dpsAt(def, lv, 1 + auraFr, S.air[i], dem.D[i]);
        if (oldLv && ti.dist[j] <= (oldLv.range ?? 0) * (1 + auraRg) * TILE_SIZE) add -= dpsAt(def, oldLv, 1 + auraFr, S.air[i], dem.D[i]);
        if (add <= 0) continue;
        add *= dem.T[i] * Math.min(3, 1 / base.slowKeep[i]) * (1 + base.paint[i] + base.armor[i]);
        g += (Math.min(add, Math.max(0, room[i])) + TAIL * add) * W[i];
      }
      return g;
    };
    const auraAt = (x, y) => {
      let fr = 0;
      let rg = 0;
      for (const o of list) {
        if (!(o.lv.fireRateBoost || o.lv.rangeBoost)) continue;
        if (Math.hypot(o.x - x, o.y - y) > (o.lv.auraRange ?? o.lv.range ?? 0) * TILE_SIZE) continue;
        fr = Math.max(fr, o.lv.fireRateBoost ?? 0);
        rg = Math.max(rg, o.lv.rangeBoost ?? 0);
      }
      return { fr, rg };
    };

    for (const def of plain) {
      const lv = def.levels[0];
      if (lv.cost > world.coins) continue;
      for (const ti of tiles) {
        if (occupied.has(`${ti.tx},${ti.ty}`)) continue;
        const a = auraAt(ti.x, ti.y);
        const g = gainPlain(def, lv, ti, null, a.fr, a.rg);
        consider(g / lv.cost, { kind: 'place', def, tx: ti.tx, ty: ti.ty });
      }
    }
    for (const o of list) {
      const t = o.tower;
      const cost = upgradeCostOf(world, t);
      if (cost === null || cost > world.coins) continue;
      const next = t.def.levels[t.level];
      if (!MODIFIERS.has(t.def.id)) {
        const ti = tileIdx.get(o.key);
        const a = auraAt(o.x, o.y);
        consider(gainPlain(t.def, next, ti, o.lv, t.aura.fireRate, t.aura.range) / cost, { kind: 'upgrade', t });
        void a;
      } else {
        const copy = list.map((q) => (q === o ? { ...q, lv: next } : q));
        const v = value(evaluate(copy, S, dem, tileIdx).C, dem, W, S);
        consider((v - baseVal) / cost, { kind: 'upgrade', t });
      }
    }
    for (const def of mods) {
      const lv = def.levels[0];
      if (lv.cost > world.coins) continue;
      for (const ti of hot) {
        if (occupied.has(`${ti.tx},${ti.ty}`)) continue;
        const copy = [...list, { def, lv, x: ti.x, y: ti.y, key: `${ti.tx},${ti.ty}` }];
        const v = value(evaluate(copy, S, dem, tileIdx).C, dem, W, S);
        consider((v - baseVal) / lv.cost, { kind: 'place', def, tx: ti.tx, ty: ti.ty });
      }
    }
    if (!best) return false;
    const r = best.kind === 'place' ? placeTower(world, best.def.id, best.tx, best.ty) : upgradeTower(world, best.t.id);
    return r.ok;
  }

  function buy() {
    let guard = 0;
    while (world.coins >= cheapest && guard++ < 40) {
      if (!decideOnce()) break;
    }
  }

  const lastBossHp = new Map();
  let leakedBossHp = 0;
  let nextAssess = 0;
  let lastKey = '';
  while (world.phase !== 'won' && world.phase !== 'lost' && world.time < MAX_TIME) {
    const key = `${world.phase}:${world.waveIndex}`;
    if (world.phase === 'build') {
      dem = buildDemand(world, S);
      buy();
      if (verbose) console.log(`  wave ${world.waveIndex + 1}/${world.waves.length} t=${world.time.toFixed(0)} hp=${world.hp} coins=${world.coins} towers=${world.towers.length}`);
      startWave(world);
      lastKey = '';
    } else if (world.time >= nextAssess) {
      nextAssess = world.time + REASSESS;
      if (world.coins >= cheapest) {
        dem = buildDemand(world, S);
        buy();
      }
    }
    void key; void lastKey;
    for (const e of world.enemies) if (e.boss) lastBossHp.set(e.id, e.hp);
    step(world, STEP);
    for (const ev of world.events) if (ev.type === 'leak' && lastBossHp.has(ev.enemyId)) leakedBossHp += lastBossHp.get(ev.enemyId);
    world.events.length = 0;
  }

  const bossHpLeft = world.enemies.filter((e) => e.boss).reduce((a, e) => a + e.hp, 0) + leakedBossHp;
  const bossAlive = bossHpLeft > 0;
  const won = world.phase === 'won';
  if (verbose) {
    console.log(`L${level} s${seed} ${world.phase} hp ${world.hp} t ${world.time.toFixed(0)}`);
    console.log('  leaks', JSON.stringify(Object.fromEntries(Object.entries(world.stats.enemies).filter(([, v]) => v.leaked).map(([k, v]) => [k, `${v.leaked}/${v.seen}`]))));
    for (const t of world.towers) console.log(`  ${t.typeId} L${t.level} @${t.tx},${t.ty} dmg ${Math.round(world.stats.towers[t.id].damage)} kills ${t.kills}`);
  }
  return {
    level,
    seed,
    won,
    timeout: world.phase !== 'won' && world.phase !== 'lost',
    hp: won ? world.hp : 0,
    maxHp: world.maxHp,
    bossHpLeft: won ? 0 : bossHpLeft,
    bossAlive,
    seconds: world.time,
    // sim time if the player also waits out every between-wave countdown
    fullSeconds: world.time + (world.waves.length - 1) * world.countdownLength,
    coinsLeft: world.coins,
    towers: world.towers.length,
    waveReached: world.waveIndex + 1,
    waves: world.waves.length,
  };
}
