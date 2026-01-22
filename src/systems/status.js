export function applySlow(enemy, factor, duration) {
  enemy.status.slowFactor = factor;
  enemy.status.slowUntil = (enemy._time || 0) + duration;
}
