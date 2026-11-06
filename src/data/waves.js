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
      { enemies: [{ id: 'grunt', count: 8, interval: 1.2 }] },
      {
        enemies: [
          { id: 'grunt', count: 8, interval: 1.0 },
          { id: 'runner', count: 4, interval: 0.8 },
        ],
      },
      {
        enemies: [
          { id: 'grunt', count: 10, interval: 0.9 },
          { id: 'runner', count: 8, interval: 0.6 },
        ],
      },
    ];
  }
  throw new Error(`no waves for level ${level}`);
}
