/** Decision 16: Gold = 0 HP lost, Silver = at most 5 HP lost, Bronze = cleared. */
export const SILVER_MAX_HP_LOST = 5;
export const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };

/** @param {number} hpLost @returns {'gold'|'silver'|'bronze'} */
export function medalFor(hpLost) {
  if (hpLost <= 0) return 'gold';
  if (hpLost <= SILVER_MAX_HP_LOST) return 'silver';
  return 'bronze';
}

/** True when `next` is strictly better than `prev` (prev may be undefined). */
export function isBetterMedal(next, prev) {
  return (MEDAL_RANK[next] ?? 0) > (MEDAL_RANK[prev] ?? 0);
}
