/** Pure voice limiter: per-sound voice cap, minimum retrigger interval and a global cap. Times are in seconds. */

/**
 * @param {{globalMax?:number, max?:number, minInterval?:number, perSound?:Record<string,{max?:number,minInterval?:number,priority?:boolean}>}} [cfg]
 * `priority` sounds ignore the global cap (alarms, boss cues) but still obey their own limits.
 */
export function createVoiceLimiter({ globalMax = 24, max = 4, minInterval = 0.05, perSound = {} } = {}) {
  const voices = new Map(); // name -> end times of live voices
  const lastStart = new Map();
  let live = 0;

  function prune(now) {
    live = 0;
    for (const [name, ends] of voices) {
      const keep = ends.filter((e) => e > now);
      if (keep.length) voices.set(name, keep); else voices.delete(name);
      live += keep.length;
    }
  }

  return {
    /** Claim a voice for `name` starting at `now` and lasting `dur`; false means drop the sound. */
    tryAcquire(name, now, dur = 0.1) {
      const cfg = perSound[name] ?? {};
      const gap = cfg.minInterval ?? minInterval;
      if (now - (lastStart.get(name) ?? -Infinity) < gap) return false;
      prune(now);
      const ends = voices.get(name) ?? [];
      if (ends.length >= (cfg.max ?? max)) return false;
      if (!cfg.priority && live >= globalMax) return false;
      ends.push(now + dur);
      voices.set(name, ends);
      lastStart.set(name, now);
      live++;
      return true;
    },
    active(now) { prune(now); return live; },
    reset() { voices.clear(); lastStart.clear(); live = 0; },
  };
}
