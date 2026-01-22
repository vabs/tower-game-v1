import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../src/core/version.js';

test('version is defined', () => {
  assert.match(VERSION, /^0\.1\.0/);
});
