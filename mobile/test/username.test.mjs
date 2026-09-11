import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, validateUsername } from '../src/utils/username.js';

test('normalizes whitespace, one at-sign and letter casing', () => {
  assert.equal(normalizeUsername('  @Minh.Thuan  '), 'minh.thuan');
});

test('accepts the documented username characters and boundaries', () => {
  assert.equal(validateUsername('abc').valid, true);
  assert.equal(validateUsername('a_b.c9').valid, true);
  assert.equal(validateUsername('a'.repeat(30)).valid, true);
});

test('rejects invalid boundaries, separators and reserved names', () => {
  ['ab', 'a'.repeat(31), 'a..b', '_abc', 'abc_', 'abc.', 'tên_việt', 'admin'].forEach((username) => {
    assert.equal(validateUsername(username).valid, false, username);
  });
});

test('allows an empty value only when removing a username is supported', () => {
  assert.equal(validateUsername('', { allowEmpty: true }).valid, true);
  assert.equal(validateUsername('', { allowEmpty: false }).valid, false);
});
