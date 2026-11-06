export function stepFixed(delta, step) {
  return Math.floor(delta / step);
}

export const MAX_FRAME_DT = 0.25;

export function createClock(step) {
  let acc = 0;
  return {
    step,
    advance(dt) {
      acc += Math.min(Math.max(dt, 0), MAX_FRAME_DT);
      const steps = Math.floor(acc / step + 1e-9);
      acc -= steps * step;
      if (acc < 0) acc = 0;
      return steps;
    },
  };
}
