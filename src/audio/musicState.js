/** Pure mapping from the game state to what the music should do. */

export const isBossWave = (world, index = world.waveIndex) =>
  !!world.waves?.[index]?.enemies?.some((g) => g.id.endsWith('_boss'));

/** Loop track for a world that is being played (or is paused). null = hold whatever is playing. */
export function battleTrackFor(world) {
  if (world.phase === 'wave') return isBossWave(world) ? 'boss' : 'battle';
  if (world.phase === 'build') return 'build';
  return null;
}

/**
 * @param {string} screen  state machine state
 * @param {object|null} world
 * @returns {{track:string|null, hold?:boolean, sting?:string, then?:string|null, duck:boolean}}
 *   track: loop to play (null with no `hold`: silence); hold: keep the current track;
 *   sting: one-shot played on entering the screen, `then`: loop to start when it ends.
 */
export function musicPlan(screen, world) {
  switch (screen) {
    case 'start': case 'level-select': return { track: 'menu', duck: false };
    case 'playing': case 'paused': {
      const track = world ? battleTrackFor(world) : null;
      return track ? { track, duck: screen === 'paused' } : { track: null, hold: true, duck: screen === 'paused' };
    }
    case 'level-complete': case 'game-end': return { track: null, sting: 'victory', then: 'menu', duck: false };
    case 'game-over': return { track: null, sting: 'defeat', then: null, duck: false };
    default: return { track: null, hold: true, duck: false };
  }
}
