const KEYS = {
  first: (e) => e.distance,
  last: (e) => -e.distance,
  strongest: (e) => e.hp,
};

export function selectTarget(tower, enemies, mode = 'first') {
  const dist = (e) => Math.hypot(e.x - tower.x, e.y - tower.y);
  const candidates = enemies.filter(
    (e) => !e.dead && !e.leaked && (!e.air || tower.canHitAir) && dist(e) <= tower.range
  );
  if (candidates.length === 0) return null;
  const score = mode === 'closest' ? (e) => -dist(e) : KEYS[mode] ?? KEYS.first;
  let best = candidates[0];
  for (const e of candidates) if (score(e) > score(best)) best = e;
  return best;
}
