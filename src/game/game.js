import { stepFixed } from '../core/time.js';
import { enemies } from '../data/enemies.js';
import { towers } from '../data/towers.js';
import { levels } from '../data/levels.js';

export function createGame({ renderer }) {
  const state = {
    time: 0,
    tick: 0,
    levelIndex: 0,
    waveIndex: 0,
    coins: 200,
    hp: 100,
    activeEnemies: [],
    placedTowers: [],
  };

  const level = levels[state.levelIndex];
  const enemyPool = enemies;
  const towerPool = towers;

  function spawnEnemy() {
    const base = enemyPool[state.waveIndex % enemyPool.length];
    state.activeEnemies.push({
      ...base,
      x: 40,
      y: 120 + (state.activeEnemies.length % 5) * 20,
      hpCurrent: base.hp,
    });
  }

  function updateEnemies(dt) {
    state.activeEnemies.forEach(enemy => {
      enemy.x += enemy.speed * 20 * dt;
    });
    state.activeEnemies = state.activeEnemies.filter(e => e.x < 900 && e.hpCurrent > 0);
  }

  function simulateTowers(dt) {
    if (state.placedTowers.length === 0) return;
    const target = state.activeEnemies[0];
    if (!target) return;
    const tower = state.placedTowers[0];
    const dps = tower.levels[0].damage * tower.levels[0].rate;
    target.hpCurrent -= dps * dt;
    if (target.hpCurrent <= 0) {
      state.coins += target.coins;
    }
  }

  function update(dt) {
    const ticks = stepFixed(dt, 1 / 60);
    state.tick += ticks;
    state.time += dt;

    if (state.tick % 30 === 0 && state.activeEnemies.length < 6) {
      spawnEnemy();
    }

    updateEnemies(dt);
    simulateTowers(dt);
  }

  function render() {
    renderer.clear();
    renderer.text(`Level ${level.id} Wave ${state.waveIndex + 1}`, 24, 24);
    renderer.text(`Enemies: ${state.activeEnemies.length}`, 24, 44);
    renderer.text(`Coins: ${state.coins}`, 24, 64);

    state.activeEnemies.forEach(enemy => {
      renderer.text('●', enemy.x, enemy.y, '#c97b5a');
    });

    state.placedTowers.forEach(tower => {
      renderer.text('▲', tower.x, tower.y, '#c2b280');
    });
  }

  function placeStarterTower() {
    if (state.placedTowers.length > 0) return;
    const tower = towerPool.find(t => t.id === 'ar_turret') || towerPool[0];
    if (tower) {
      state.placedTowers.push({
        ...tower,
        x: 200,
        y: 260,
      });
    }
  }

  placeStarterTower();

  return { state, update, render };
}
