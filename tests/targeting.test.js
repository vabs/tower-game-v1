import { test } from 'vitest';
import assert from 'node:assert/strict';
import { selectTarget } from '../src/systems/targeting.js';

const tower = { x: 0, y: 0, range: 5 };
const enemies = [
  { id: 1, x: 3, y: 0, distance: 10, hp: 50 },
  { id: 2, x: 4, y: 0, distance: 30, hp: 20 },
  { id: 3, x: 2, y: 0, distance: 5, hp: 90 },
  { id: 4, x: 9, y: 0, distance: 99, hp: 999 },
];

test('closest picks nearest in range', () => {
  assert.equal(selectTarget(tower, enemies, 'closest').id, 3);
});

test('first picks max path distance in range', () => {
  assert.equal(selectTarget(tower, enemies, 'first').id, 2);
});

test('last picks min path distance in range', () => {
  assert.equal(selectTarget(tower, enemies, 'last').id, 3);
});

test('strongest picks max hp in range', () => {
  assert.equal(selectTarget(tower, enemies, 'strongest').id, 3);
});

test('default mode is first', () => {
  assert.equal(selectTarget(tower, enemies).id, 2);
});

test('returns null when nothing in range', () => {
  assert.equal(selectTarget(tower, [enemies[3]], 'first'), null);
});

test('air enemies need canHitAir', () => {
  const air = { id: 9, x: 1, y: 0, distance: 100, hp: 1, air: true };
  const list = [air, enemies[0]];
  assert.equal(selectTarget(tower, list, 'first').id, 1);
  assert.equal(selectTarget({ ...tower, canHitAir: true }, list, 'first').id, 9);
  assert.equal(selectTarget(tower, [air], 'first'), null);
});

test('does not mutate input array', () => {
  const copy = enemies.slice();
  selectTarget(tower, enemies, 'closest');
  assert.deepEqual(enemies, copy);
});
