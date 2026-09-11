const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/user.model');

test('activity preference is private while self serialization includes it', () => {
  const user = User.build({
    id: 1,
    uid: 'LT1234567890',
    name: 'Test User',
    email: 'test@example.invalid',
    password: 'hashed',
    show_activity_status: false,
    is_online: false,
    last_seen_at: null,
  });

  const publicUser = user.toJSON();
  const selfUser = user.toSelfJSON();

  assert.equal(Object.hasOwn(publicUser, 'show_activity_status'), false);
  assert.equal(Object.hasOwn(publicUser, 'password'), false);
  assert.equal(selfUser.show_activity_status, false);
  assert.equal(Object.hasOwn(selfUser, 'password'), false);
});
