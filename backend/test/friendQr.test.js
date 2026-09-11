const test = require('node:test');
const assert = require('node:assert/strict');
const {
  serializeQrUser,
  relationshipFromFriendship,
  resolveFriendIdentity,
} = require('../src/services/friendQr.service');

const target = {
  id: 2,
  uid: 'LT-7K9M2Q4WX8NP',
  name: 'Friend',
  username: 'friend_2',
  avatar: null,
  bio: null,
  is_online: true,
  email: 'private@example.com',
  phone: '0900000000',
  role: 'admin',
  password: 'secret',
};

test('QR serializer is an explicit public allowlist', () => {
  assert.deepEqual(serializeQrUser(target), {
    id: 2,
    uid: 'LT-7K9M2Q4WX8NP',
    name: 'Friend',
    username: 'friend_2',
    avatar: null,
    bio: null,
    is_online: true,
  });
});

test('relationship direction is derived from current user', () => {
  assert.equal(relationshipFromFriendship(1, null), 'none');
  assert.equal(relationshipFromFriendship(1, { status: 'rejected' }), 'rejected');
  assert.equal(relationshipFromFriendship(1, { status: 'accepted' }), 'accepted');
  assert.equal(relationshipFromFriendship(1, { status: 'pending', user_id: 1 }), 'outgoing_pending');
  assert.equal(relationshipFromFriendship(1, { status: 'pending', user_id: 2 }), 'incoming_pending');
});

const dependencies = ({ blocked = null, friendship = null, conversation = null } = {}) => ({
  UserModel: { findOne: async () => target },
  BlockedUserModel: { findOne: async () => blocked },
  FriendshipModel: { findOne: async () => friendship },
  findConversation: async () => conversation,
});

test('QR relationship precedence is self before blocked and friendship', async () => {
  const result = await resolveFriendIdentity(2, target.uid, dependencies({
    blocked: { id: 1 },
    friendship: { id: 2, status: 'accepted' },
  }));
  assert.equal(result.relationship, 'self');
  assert.equal(result.friendship_id, null);
});

test('QR relationship precedence is blocked before accepted', async () => {
  const result = await resolveFriendIdentity(1, target.uid, dependencies({
    blocked: { id: 1 },
    friendship: { id: 2, status: 'accepted' },
    conversation: { id: 3 },
  }));
  assert.equal(result.relationship, 'blocked');
  assert.equal(result.friendship_id, null);
  assert.equal(result.conversation_id, null);
});

test('accepted QR relationship returns existing conversation without creating one', async () => {
  const result = await resolveFriendIdentity(1, target.uid, dependencies({
    friendship: { id: 8, status: 'accepted', user_id: 1, friend_id: 2 },
    conversation: { id: 12 },
  }));
  assert.equal(result.relationship, 'accepted');
  assert.equal(result.friendship_id, 8);
  assert.equal(result.conversation_id, 12);
});
