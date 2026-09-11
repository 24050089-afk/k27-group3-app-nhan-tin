const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUsername,
  validateUsername,
} = require('../src/utils/username');

test('normalizeUsername trims, removes one leading @ and lowercases', () => {
  assert.equal(normalizeUsername('  @Minh.Thuan_2  '), 'minh.thuan_2');
  assert.equal(normalizeUsername('@@User'), '@user');
  assert.equal(normalizeUsername(null), null);
});

test('username accepts the 3 and 30 character boundaries', () => {
  assert.equal(validateUsername('abc').valid, true);
  assert.equal(validateUsername('a'.repeat(30)).valid, true);
});

test('username rejects the 2 and 31 character boundaries', () => {
  assert.equal(validateUsername('ab').code, 'too_short');
  assert.equal(validateUsername('a'.repeat(31)).code, 'too_long');
});

test('username enforces punctuation and ASCII rules', () => {
  for (const value of ['a..b', 'tênuser', 'a b', 'a-b', '_abc', 'abc_', 'abc.']) {
    assert.equal(validateUsername(value).valid, false, value);
  }
  for (const value of ['a_b', 'a.b', 'a0_b.c9']) {
    assert.equal(validateUsername(value).valid, true, value);
  }
});

test('username rejects reserved handles after normalization', () => {
  assert.equal(validateUsername('@ADMIN').code, 'reserved');
  assert.equal(validateUsername('support').code, 'reserved');
});
