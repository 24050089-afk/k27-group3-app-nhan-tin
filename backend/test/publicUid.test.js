const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PUBLIC_UID_REGEX,
  generatePublicUid,
  normalizePublicUid,
  isValidPublicUid,
} = require('../src/utils/publicUid');

test('generatePublicUid always returns a canonical uppercase UID', () => {
  for (let index = 0; index < 1000; index += 1) {
    assert.match(generatePublicUid(), PUBLIC_UID_REGEX);
  }
});

test('generatePublicUid maps exactly twelve random symbols', () => {
  const uid = generatePublicUid((length) => Buffer.alloc(length, 31));
  assert.equal(uid, 'LT-ZZZZZZZZZZZZ');
});

test('generated UID sample has no duplicates', () => {
  const values = new Set(Array.from({ length: 5000 }, () => generatePublicUid()));
  assert.equal(values.size, 5000);
});

test('normalizePublicUid trims and canonicalizes lowercase input', () => {
  assert.equal(normalizePublicUid('  lt-7k9m2q4wx8np  '), 'LT-7K9M2Q4WX8NP');
});

test('normalizePublicUid rejects malformed, ambiguous and oversized values', () => {
  assert.equal(normalizePublicUid(123), null);
  assert.equal(normalizePublicUid('LT-123'), null);
  assert.equal(normalizePublicUid('LT-OOOOOOOOOOOO'), null);
  assert.equal(normalizePublicUid(`LT-${'A'.repeat(100)}`), null);
  assert.equal(isValidPublicUid('LT-7K9M2Q4WX8NP'), true);
});
