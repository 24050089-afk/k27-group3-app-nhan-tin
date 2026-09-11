const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareConversationActivity,
  getConversationActivityTimestamp,
  normalizeId,
  sortConversationsByActivity,
  toEpoch,
} = require('../src/utils/conversationOrder');

const conversation = ({ id, pinned = false, messageId, createdAt, type = 'group', conversationCreatedAt } = {}) => ({
  id,
  type,
  created_at: conversationCreatedAt,
  me: { pinned },
  last_message: messageId === undefined ? null : { id: messageId, created_at: createdAt },
});

const camelCaseConversation = ({ id, messageId, createdAt }) => ({
  id,
  me: { pinned: false },
  last_message: { id: messageId, createdAt },
});

test('normalizes timestamps and numeric IDs safely', () => {
  assert.equal(toEpoch(null), null);
  assert.equal(toEpoch('not-a-date'), null);
  assert.equal(toEpoch('2026-08-02T10:00:00.000Z'), 1785664800000);
  assert.equal(normalizeId('42'), 42);
  assert.equal(normalizeId('invalid'), 0);
});

test('keeps pinned conversations ahead of newer unpinned conversations', () => {
  const pinned = conversation({ id: 1, pinned: true, messageId: 10, createdAt: '2026-01-01T00:00:00Z' });
  const unpinned = conversation({ id: 2, messageId: 20, createdAt: '2026-08-01T00:00:00Z' });
  assert.deepEqual(sortConversationsByActivity([unpinned, pinned]).map((item) => item.id), [1, 2]);
});

test('sorts newest message first inside each pin block', () => {
  const older = conversation({ id: 1, messageId: 10, createdAt: '2026-08-01T00:00:00Z' });
  const newer = conversation({ id: 2, messageId: 11, createdAt: '2026-08-02T00:00:00Z' });
  assert.deepEqual(sortConversationsByActivity([older, newer]).map((item) => item.id), [2, 1]);
});

test('supports the Sequelize runtime createdAt timestamp without changing the API payload', () => {
  const older = camelCaseConversation({ id: 99, messageId: 99, createdAt: '2026-08-01T00:00:00Z' });
  const newer = camelCaseConversation({ id: 1, messageId: 1, createdAt: '2026-08-02T00:00:00Z' });
  assert.deepEqual(sortConversationsByActivity([older, newer]).map((item) => item.id), [1, 99]);
});

test('places conversations with messages before empty conversations', () => {
  const empty = conversation({ id: 99 });
  const active = conversation({ id: 1, messageId: 1, createdAt: '2020-01-01T00:00:00Z' });
  assert.deepEqual(sortConversationsByActivity([empty, active]).map((item) => item.id), [1, 99]);
});

test('uses creation time as starter activity for an empty private conversation', () => {
  const newFriend = conversation({
    id: 2,
    type: 'private',
    conversationCreatedAt: '2026-08-02T00:00:00Z',
  });
  const olderMessage = conversation({ id: 1, messageId: 1, createdAt: '2026-08-01T00:00:00Z' });
  assert.equal(getConversationActivityTimestamp(newFriend), '2026-08-02T00:00:00Z');
  assert.deepEqual(sortConversationsByActivity([olderMessage, newFriend]).map((item) => item.id), [2, 1]);
});

test('does not promote an empty group as starter activity', () => {
  const emptyGroup = conversation({
    id: 2,
    type: 'group',
    conversationCreatedAt: '2026-08-03T00:00:00Z',
  });
  const active = conversation({ id: 1, messageId: 1, createdAt: '2020-01-01T00:00:00Z' });
  assert.equal(getConversationActivityTimestamp(emptyGroup), null);
  assert.deepEqual(sortConversationsByActivity([emptyGroup, active]).map((item) => item.id), [1, 2]);
});

test('uses message ID and conversation ID as deterministic tie breakers', () => {
  const timestamp = '2026-08-02T00:00:00Z';
  const items = [
    conversation({ id: 2, messageId: '7', createdAt: timestamp }),
    conversation({ id: 1, messageId: 8, createdAt: timestamp }),
    conversation({ id: 3, messageId: 8, createdAt: timestamp }),
  ];
  assert.deepEqual(sortConversationsByActivity(items).map((item) => item.id), [3, 1, 2]);
});

test('puts a valid timestamp before an invalid timestamp then falls back to IDs', () => {
  const valid = conversation({ id: 1, messageId: 1, createdAt: '2026-08-02T00:00:00Z' });
  const invalidHighId = conversation({ id: 2, messageId: 999, createdAt: 'invalid' });
  assert.deepEqual(sortConversationsByActivity([invalidHighId, valid]).map((item) => item.id), [1, 2]);
});

test('does not mutate the input and remains deterministic', () => {
  const input = [conversation({ id: 1 }), conversation({ id: 3 }), conversation({ id: 2 })];
  const snapshot = [...input];
  const first = sortConversationsByActivity(input);
  const second = sortConversationsByActivity(input);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(first.map((item) => item.id), [3, 2, 1]);
  assert.deepEqual(second, first);
  assert.equal(compareConversationActivity(first[0], first[0]), 0);
});
