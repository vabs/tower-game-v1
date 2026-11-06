import { enemies } from './enemies.js';

/** Decision 13/12: bosses are derived from regular enemies. */
export const BOSS_HP_MULT = 12;
export const BOSS_SPEED_MULT = 0.8;
export const BOSS_COIN_MULT = 10;
export const BOSS_LEAK_DAMAGE = 25;

const BASES = { heavy_boss: 'heavy', sky_tank_boss: 'sky_tank', tank_boss: 'tank', bulldozer_boss: 'bulldozer' };

export const bosses = Object.entries(BASES).map(([id, baseId]) => {
  const b = enemies.find((e) => e.id === baseId);
  return {
    id,
    name: `${b.name} Boss`,
    type: b.type,
    hp: b.hp * BOSS_HP_MULT,
    speed: b.speed * BOSS_SPEED_MULT,
    coins: b.coins * BOSS_COIN_MULT,
    leak: BOSS_LEAK_DAMAGE,
    boss: true,
    scale: 1.5,
    sprite: `bosses/${id}`,
  };
});

/** `levels[].boss` value -> ordered boss ids that appear in the final wave. */
export const BOSS_SEQUENCE = {
  heavy_boss: ['heavy_boss'],
  sky_tank_boss: ['sky_tank_boss'],
  tank_boss: ['tank_boss'],
  bulldozer_boss: ['bulldozer_boss'],
  final_boss: ['bulldozer_boss', 'sky_tank_boss'],
};
