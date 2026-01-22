export function summarizeTowerStats(list) {
  return list.map(t => ({
    ...t,
    dpc: t.cost > 0 ? Math.round((t.damage / t.cost) * 100) / 100 : 0,
  }));
}

export function summarizeEnemyStats(list) {
  return list.map(e => ({
    ...e,
    seen: e.seen ?? 0,
  }));
}
