export function stipendForLevel(level) {
  return 10 + Math.floor(level / 2);
}

export function upgradeCost(base, inCombat) {
  return inCombat ? Math.ceil(base * 1.15) : base;
}
