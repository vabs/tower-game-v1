export function stepFixed(delta, step) {
  return Math.floor(delta / step);
}

export const MAX_FRAME_DT = 0.25;
/** Hard cap on fixed steps per rendered frame (avoids a spiral of death at high game speed). */
export const MAX_STEPS_PER_FRAME = 30;

export function createClock(step) {
  let acc = 0;
  return {
    step,
    /** @param speed game speed multiplier (1, 2, 3) */
    advance(dt, speed = 1) {
      acc += Math.min(Math.max(dt, 0), MAX_FRAME_DT) * speed;
      let steps = Math.floor(acc / step + 1e-9);
      acc -= steps * step;
      if (acc < 0) acc = 0;
      return Math.min(steps, MAX_STEPS_PER_FRAME);
    },
  };
}
