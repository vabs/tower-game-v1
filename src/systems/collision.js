export function hitTest(proj, enemy) {
  const dx = enemy.x - proj.x;
  const dy = enemy.y - proj.y;
  return Math.hypot(dx, dy) <= proj.radius;
}
