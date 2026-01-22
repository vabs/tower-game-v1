export function isSupplyDropLevel(level) {
  return level % 6 === 0;
}

export function totalWavesWithSupply(level, combatWaves) {
  return combatWaves + (isSupplyDropLevel(level) ? 1 : 0);
}
