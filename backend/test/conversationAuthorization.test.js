const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canRecallMessage,
  canMutateConversation,
  isGroupOwner,
} = require('../src/utils/conversationAuthorization');

test('private creator can recall own message but not another user message', () => {
  assert.equal(canRecallMessage({ conversationType: 'private', senderId: 7, userId: 7, memberRole: 'admin' }), true);
  assert.equal(canRecallMessage({ conversationType: 'private', senderId: 8, userId: 7, memberRole: 'admin' }), false);
});

test('group admin can recall another user message, regular member cannot', () => {
  assert.equal(canRecallMessage({ conversationType: 'group', senderId: 8, userId: 7, memberRole: 'admin' }), true);
  assert.equal(canRecallMessage({ conversationType: 'group', senderId: 8, userId: 7, memberRole: 'member' }), false);
});

test('conversation mutation admin access is group-only', () => {
  assert.equal(canMutateConversation({ conversationType: 'group', memberRole: 'admin' }), true);
  assert.equal(canMutateConversation({ conversationType: 'private', memberRole: 'admin' }), false);
  assert.equal(canMutateConversation({ conversationType: 'group', memberRole: 'member' }), false);
});

test('only the group creator is treated as owner', () => {
  assert.equal(isGroupOwner({ conversationType: 'group', createdBy: 7, userId: 7 }), true);
  assert.equal(isGroupOwner({ conversationType: 'private', createdBy: 7, userId: 7 }), false);
  assert.equal(isGroupOwner({ conversationType: 'group', createdBy: 8, userId: 7 }), false);
});
