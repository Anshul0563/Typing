import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJwtExpiry } from '../src/config/env.js';

test('numeric JWT expiry values are interpreted as days', () => {
  assert.equal(normalizeJwtExpiry('7'), '7d');
  assert.equal(normalizeJwtExpiry(' 30 '), '30d');
});

test('JWT expiry values with explicit units remain unchanged', () => {
  assert.equal(normalizeJwtExpiry('12h'), '12h');
  assert.equal(normalizeJwtExpiry('7d'), '7d');
  assert.equal(normalizeJwtExpiry(''), '7d');
});
