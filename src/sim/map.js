import { toWorld, TILE_SIZE } from '../core/grid.js';
import { pathLength } from '../core/path.js';

/**
 * @typedef {'buildable'|'blocked'|'path'|'spawn'|'goal'} TileKind
 * @typedef {{id:string,w:number,h:number,tiles:TileKind[][],tilePaths:{x:number,y:number}[][],
 *   paths:{x:number,y:number}[][],pathLengths:number[],spawn:{x:number,y:number},spawns:{x:number,y:number}[],
 *   pick:'first'|'random'|'alternate',goal:{x:number,y:number},
 *   kind:(x:number,y:number)=>TileKind|null,buildable:(x:number,y:number)=>boolean}} GameMap
 */

/** Pure: build a runtime map from a template. Throws on malformed templates. */
export function loadMap(template) {
  const h = template.grid.length;
  const w = template.grid[0].length;
  /** @type {TileKind[][]} */
  const tiles = [];
  const spawns = [];
  let goalCell = null;
  for (let y = 0; y < h; y++) {
    const row = template.grid[y];
    if (row.length !== w) throw new Error(`map ${template.id}: row ${y} has width ${row.length}, expected ${w}`);
    tiles.push([]);
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (c === '.') tiles[y].push('buildable');
      else if (c === '#') tiles[y].push('blocked');
      else if (c === 'S') { tiles[y].push('spawn'); spawns.push({ x, y }); }
      else if (c === 'G') { tiles[y].push('goal'); goalCell = { x, y }; }
      else throw new Error(`map ${template.id}: bad char '${c}' at ${x},${y}`);
    }
  }
  if (!spawns.length || !goalCell) throw new Error(`map ${template.id}: needs S and G`);

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  for (const wps of template.paths) {
    const first = wps[0];
    const last = wps[wps.length - 1];
    if (!spawns.some((s) => s.x === first.x && s.y === first.y)) throw new Error(`map ${template.id}: path must start at S`);
    if (last.x !== goalCell.x || last.y !== goalCell.y) throw new Error(`map ${template.id}: path must end at G`);
    for (let i = 0; i < wps.length; i++) {
      const b = wps[i];
      if (!inBounds(b.x, b.y)) throw new Error(`map ${template.id}: waypoint out of bounds`);
      if (i === 0) continue;
      const a = wps[i - 1];
      if (a.x !== b.x && a.y !== b.y) throw new Error(`map ${template.id}: diagonal segment`);
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      for (let x = a.x, y = a.y; ; x += dx, y += dy) {
        if (tiles[y][x] === 'blocked') throw new Error(`map ${template.id}: path crosses blocked tile ${x},${y}`);
        if (tiles[y][x] === 'buildable') tiles[y][x] = 'path';
        if (x === b.x && y === b.y) break;
      }
    }
  }

  const paths = template.paths.map((p) => p.map((t) => toWorld(t, TILE_SIZE)));
  const kind = (x, y) => (inBounds(x, y) ? tiles[y][x] : null);
  return {
    id: template.id,
    w,
    h,
    tiles,
    tilePaths: template.paths,
    paths,
    pathLengths: paths.map(pathLength),
    spawn: spawns[0],
    spawns,
    pick: template.pick ?? 'first',
    goal: goalCell,
    kind,
    buildable: (x, y) => kind(x, y) === 'buildable',
  };
}

/**
 * Non-throwing validator for templates (used by tests). Returns a list of problems; [] means valid:
 * every path starts at an S, ends at the G, has axis-aligned segments inside the grid and avoids '#'.
 */
export function validateMap(template) {
  const errors = [];
  const grid = template.grid;
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const spawns = [];
  const goals = [];
  for (let y = 0; y < h; y++) {
    if (grid[y].length !== w) errors.push(`row ${y} width ${grid[y].length} != ${w}`);
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'S') spawns.push({ x, y });
      if (grid[y][x] === 'G') goals.push({ x, y });
    }
  }
  if (!spawns.length) errors.push('no spawn');
  if (goals.length !== 1) errors.push(`expected exactly one goal, found ${goals.length}`);
  if (!template.paths || !template.paths.length) errors.push('no paths');
  const at = (x, y) => grid[y]?.[x];
  (template.paths ?? []).forEach((wps, pi) => {
    const tag = `path ${pi}`;
    if (wps.length < 2) return errors.push(`${tag}: too short`);
    const f = wps[0];
    const l = wps[wps.length - 1];
    if (!spawns.some((s) => s.x === f.x && s.y === f.y)) errors.push(`${tag}: does not start at an S`);
    if (!goals.some((g) => g.x === l.x && g.y === l.y)) errors.push(`${tag}: does not end at G`);
    for (let i = 0; i < wps.length; i++) {
      const b = wps[i];
      if (b.x < 0 || b.y < 0 || b.x >= w || b.y >= h) { errors.push(`${tag}: waypoint ${i} out of bounds`); continue; }
      if (i === 0) continue;
      const a = wps[i - 1];
      if (a.x !== b.x && a.y !== b.y) { errors.push(`${tag}: segment ${i} not axis-aligned`); continue; }
      if (a.x === b.x && a.y === b.y) errors.push(`${tag}: zero-length segment ${i}`);
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      for (let x = a.x, y = a.y; x >= 0 && y >= 0 && x < w && y < h; x += dx, y += dy) {
        if (at(x, y) === '#') errors.push(`${tag}: crosses blocked tile ${x},${y}`);
        if (x === b.x && y === b.y) break;
      }
    }
  });
  return errors;
}
