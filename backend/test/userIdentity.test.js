const test = require('node:test');
const assert = require('node:assert/strict');
const {
  UserIdentityError,
  createUserWithIdentity,
  buildProfileUpdates,
  updateUserProfile,
  getUsernameAvailability,
} = require('../src/services/userIdentity.service');

const transactionStub = {
  transaction: async (callback) => callback({ id: 'transaction' }),
};

const uniqueError = (field) => ({
  name: 'SequelizeUniqueConstraintError',
  fields: { [field]: 'duplicate' },
  errors: [{ path: field }],
});

test('register identity ignores client UID and normalizes username', async () => {
  let received;
  const UserModel = {
    create: async (payload) => {
      received = payload;
      return payload;
    },
  };
  await createUserWithIdentity({
    name: 'Minh',
    email: ' MINH@EXAMPLE.COM ',
    password: 'secret',
    username: ' @Minh.Thuan ',
    uid: 'LT-CLIENTVALUE0',
    role: 'admin',
  }, {
    UserModel,
    sequelizeInstance: transactionStub,
    uidGenerator: () => 'LT-7K9M2Q4WX8NP',
  });

  assert.equal(received.uid, 'LT-7K9M2Q4WX8NP');
  assert.equal(received.username, 'minh.thuan');
  assert.equal(received.email, 'minh@example.com');
  assert.equal(Object.hasOwn(received, 'role'), false);
});

test('register identity retries only UID collisions', async () => {
  let attempts = 0;
  const UserModel = {
    create: async (payload) => {
      attempts += 1;
      if (attempts === 1) throw uniqueError('uid');
      return payload;
    },
  };
  const values = ['LT-000000000000', 'LT-111111111111'];
  const result = await createUserWithIdentity({
    name: 'A', email: 'a@example.com', password: 'secret',
  }, {
    UserModel,
    sequelizeInstance: transactionStub,
    uidGenerator: () => values.shift(),
  });

  assert.equal(attempts, 2);
  assert.equal(result.uid, 'LT-111111111111');
});

test('register identity stops after the bounded UID retry count', async () => {
  const UserModel = { create: async () => { throw uniqueError('uid'); } };
  await assert.rejects(
    () => createUserWithIdentity({
      name: 'A', email: 'a@example.com', password: 'secret',
    }, {
      UserModel,
      sequelizeInstance: transactionStub,
      uidGenerator: () => 'LT-000000000000',
      maxAttempts: 2,
    }),
    (error) => error instanceof UserIdentityError && error.code === 'UID_TAKEN' && error.status === 500
  );
});

test('register identity maps username conflicts to HTTP 409 without UID retry', async () => {
  let attempts = 0;
  const UserModel = { create: async () => { attempts += 1; throw uniqueError('username'); } };
  await assert.rejects(
    () => createUserWithIdentity({
      name: 'A', email: 'a@example.com', password: 'secret', username: 'valid_name',
    }, { UserModel, sequelizeInstance: transactionStub }),
    (error) => error.code === 'USERNAME_TAKEN' && error.status === 409
  );
  assert.equal(attempts, 1);
});

test('profile whitelist ignores immutable and sensitive fields', () => {
  const current = { name: 'Old', username: 'old_name', phone: null, avatar: null, bio: null };
  const updates = buildProfileUpdates(current, {
    name: 'New',
    username: '@NEW.Name',
    uid: 'LT-AAAAAAAAAAAA',
    id: 999,
    role: 'admin',
    email: 'other@example.com',
    password: 'new-password',
  });
  assert.deepEqual(updates, { name: 'New', username: 'new.name' });
});

test('activity-status preference accepts only booleans', () => {
  assert.deepEqual(
    buildProfileUpdates({ show_activity_status: true }, { show_activity_status: false }),
    { show_activity_status: false }
  );
  assert.throws(
    () => buildProfileUpdates({ show_activity_status: true }, { show_activity_status: 'false' }),
    (error) => error.code === 'INVALID_ACTIVITY_STATUS' && error.status === 422
  );
});

test('disabling activity status immediately hides online and last-seen state', async () => {
  let received;
  const user = {
    show_activity_status: true,
    update: async (updates) => {
      received = updates;
      Object.assign(user, updates);
    },
  };

  await updateUserProfile(user, { show_activity_status: false });

  assert.equal(received.show_activity_status, false);
  assert.equal(received.is_online, false);
  assert.equal(received.last_seen_at, null);
});

test('empty username removes the handle and normalized unchanged username is not written', () => {
  assert.deepEqual(buildProfileUpdates({ username: 'same_name' }, { username: '@SAME_NAME' }), {});
  assert.deepEqual(buildProfileUpdates({ username: 'same_name' }, { username: '   ' }), { username: null });
});

test('availability validates first and excludes the current account', async () => {
  let options;
  const UserModel = {
    findOne: async (value) => {
      options = value;
      return null;
    },
  };
  const result = await getUsernameAvailability('@Available.Name', 7, { UserModel });
  assert.deepEqual(result, { username: 'available.name', available: true, reason: null });
  assert.equal(options.where.username, 'available.name');

  const invalid = await getUsernameAvailability('ab', 7, { UserModel });
  assert.deepEqual(invalid, { username: 'ab', available: false, reason: 'too_short' });
});
