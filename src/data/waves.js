/**
 * @typedef {{id:string,count:number,interval:number}} SpawnGroup
 * @typedef {{enemies:SpawnGroup[]}} WaveDef
 */

/** Seconds between consecutive groups inside one wave. */
export const GROUP_GAP = 1.5;

// M1: hardcoded for level 1. M3 replaces this with a generator.
/** @returns {WaveDef[]} */
export function buildWaves(level) {
  if (level === 1) {
    return [
      { enemies: [{ id: 'grunt', count: 6, interval: 1.4 }] },
      {
        enemies: [
          { id: 'grunt', count: 6, interval: 1.2 },
          { id: 'runner', count: 3, interval: 1.0 },
        ],
      },
      {
        enemies: [
          { id: 'grunt', count: 8, interval: 1.0 },
          { id: 'runner', count: 5, interval: 0.8 },
        ],
      },
    ];
  }
  throw new Error(`no waves for level ${level}`);
}
