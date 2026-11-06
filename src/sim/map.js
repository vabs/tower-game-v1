import { toWorld, TILE_SIZE } from '../core/grid.js';
import { pathLength } from '../core/path.js';

/**
 * @typedef {'buildable'|'blocked'|'path'|'spawn'|'goal'} TileKind
 * @typedef {{id:string,w:number,h:number,tiles:TileKind[][],tilePaths:{x:number,y:number}[][],
 *   paths:{x:number,y:number}[][],pathLengths:number[],spawn:{x:number,y:number},goal:{x:number,y:number},
 *   kind:(x:number,y:number)=>TileKind|null,buildable:(x:number,y:number)=>boolean}} GameMap
 */

/** Pure: build a runtime map from a template. Throws on malformed templates. */
export function loadMap(template) {
  const h = template.grid.length;
  const w = template.grid[0].length;
  /** @type {TileKind[][]} */
  const tiles = [];
  let spawnCell = null;
  let goalCell = null;
  for (let y = 0; y < h; y++) {
    const row = template.grid[y];
    if (row.length !== w) throw new Error(`map ${template.id}: row ${y} has width ${row.length}, expected ${w}`);
    tiles.push([]);
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (c === '.') tiles[y].push('buildable');
      else if (c === '#') tiles[y].push('blocked');
      else if (c === 'S') { tiles[y].push('spawn'); spawnCell = { x, y }; }
      else if (c === 'G') { tiles[y].push('goal'); goalCell = { x, y }; }
      else throw new Error(`map ${template.id}: bad char '${c}' at ${x},${y}`);
    }
  }
  if (!spawnCell || !goalCell) throw new Error(`map ${template.id}: needs S and G`);

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  for (const wps of template.paths) {
    const first = wps[0];
    const last = wps[wps.length - 1];
    if (first.x !== spawnCell.x || first.y !== spawnCell.y) throw new Error(`map ${template.id}: path must start at S`);
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
    spawn: spawnCell,
    goal: goalCell,
    kind,
    buildable: (x, y) => kind(x, y) === 'buildable',
  };
}
