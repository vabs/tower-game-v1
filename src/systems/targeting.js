export function selectTarget(tower, enemies, mode = 'first') {
  const inRange = enemies.filter(e => {
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    return Math.hypot(dx, dy) <= tower.range;
  });
  if (inRange.length === 0) return null;
  if (mode === 'closest') {
    return inRange.sort((a, b) => {
      const da = Math.hypot(a.x - tower.x, a.y - tower.y);
      const db = Math.hypot(b.x - tower.x, b.y - tower.y);
      return da - db;
    })[0];
  }
  return inRange[0];
}
