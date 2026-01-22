export function toWorld(tile, size) {
  return { x: tile.x * size + size / 2, y: tile.y * size + size / 2 };
}

export function toTile(world, size) {
  return { x: Math.floor(world.x / size), y: Math.floor(world.y / size) };
}
