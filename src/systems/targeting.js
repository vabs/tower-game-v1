/** Path length still to walk. Missing `length` (bare test objects) counts as 0. */
const remaining = (e) => (e.length ?? 0) - e.distance;

const KEYS = {
  first: (e) => -remaining(e),
  last: (e) => remaining(e),
  strongest: (e) => e.hp,
  // Air first, then closest to the exit (route lengths are far below 1e9).
  air: (e) => (e.air ? 1e9 : 0) - remaining(e),
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
