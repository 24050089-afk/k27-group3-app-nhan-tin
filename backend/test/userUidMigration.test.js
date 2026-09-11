const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findRedundantLegacyUniqueIndexes,
  isTooManyKeysError,
} = require('../migrations/202608020001-add-public-uid-to-users');

const uniqueIndex = (name, column) => ({
  name,
  unique: true,
  fields: [{ attribute: column }],
});

test('keeps canonical legacy unique indexes and removes only equivalent duplicates', () => {
  const indexes = [
    uniqueIndex('email', 'email'),
    uniqueIndex('email_2', 'email'),
    uniqueIndex('phone', 'phone'),
    uniqueIndex('phone_2', 'phone'),
    uniqueIndex('username', 'username'),
    uniqueIndex('username_2', 'username'),
    uniqueIndex('unrelated_uid', 'uid'),
    { name: 'email_search', unique: false, fields: [{ attribute: 'email' }] },
    { name: 'email_phone', unique: true, fields: [{ attribute: 'email' }, { attribute: 'phone' }] },
  ];

  assert.deepEqual(
    findRedundantLegacyUniqueIndexes(indexes),
    ['email_2', 'phone_2', 'username_2']
  );
});

test('keeps one deterministic equivalent index when a canonical name is absent', () => {
  const indexes = [
    uniqueIndex('email_3', 'email'),
    uniqueIndex('email_2', 'email'),
  ];

  assert.deepEqual(findRedundantLegacyUniqueIndexes(indexes), ['email_3']);
});

test('recognizes the MySQL key-limit error from Sequelize wrappers only', () => {
  assert.equal(isTooManyKeysError({ original: { code: 'ER_TOO_MANY_KEYS' } }), true);
  assert.equal(isTooManyKeysError({ parent: { code: 'ER_TOO_MANY_KEYS' } }), true);
  assert.equal(isTooManyKeysError({ original: { code: 'ER_DUP_KEYNAME' } }), false);
});
