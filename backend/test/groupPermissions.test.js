const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultPolicy, PERMISSION_KEYS, ROLE_NAMES, ROLE_PERMISSION_KEYS, ALL_PERMISSION_KEYS, capabilitiesFor, requiredCapabilities, assertCapabilities, parsePermissionPatch } = require('../src/utils/groupPermissions');

test('all 32 policies preserve owner/admin access and apply parent/child restrictions to members', () => {
  for (let mask = 0; mask < 32; mask += 1) {
    const policy = { version: 1, ...defaultPolicy(), ...Object.fromEntries(PERMISSION_KEYS.map((key, i) => [key, !!(mask & (1 << i))])) };
    const group = { type: 'group', created_by: 1 };
    for (const member of [{ user_id: 1, role: 'admin' }, { user_id: 2, role: 'admin' }]) {
      const caps = capabilitiesFor(group, member, policy, true);
      assert.equal(caps.manage_permissions, member.user_id === 1);
      assert.equal(caps.send_photos, true);
      assert.equal(caps.react, true);
    }
    const caps = capabilitiesFor(group, { user_id: 3, role: 'member' }, policy, true);
    assert.equal(caps.manage_permissions, false);
    assert.equal(caps.send_text_messages, policy.members_can_send_text_messages);
    assert.equal(caps.send_photos, policy.members_can_send_media && policy.members_can_send_photos);
    assert.equal(caps.send_voice_messages, policy.members_can_send_media && policy.members_can_send_voice_messages);
    assert.equal(caps.react, policy.members_can_react);
  }
});

test('missing/corrupt policies fail closed even for owner; private policy is not required', () => {
  const owner = { user_id: 1, role: 'admin' };
  for (const policy of [null, {}, { ...defaultPolicy(), version: 0 }, { ...defaultPolicy(), version: 1, members_can_react: 1 }]) {
    assert.throws(() => capabilitiesFor({ type: 'group', created_by: 1 }, owner, policy), { code: 'GROUP_POLICY_UNAVAILABLE' });
  }
  assert.equal(capabilitiesFor({ type: 'private' }, owner, null, true).manage_permissions, false);
  assert.equal(capabilitiesFor({ type: 'private' }, owner, null).send_photos, true);
  assert.throws(() => capabilitiesFor({ type: 'group' }, null, null), { code: 'CONVERSATION_NOT_FOUND' });
});

test('owner wins over admin role and each role follows its own policy', () => {
  const policy = { version: 1, ...defaultPolicy(), owner_can_react: false, admins_can_react: false, members_can_react: true };
  assert.equal(capabilitiesFor({ type: 'group', created_by: 1 }, { user_id: 1, role: 'admin' }, policy).react, false);
  assert.equal(capabilitiesFor({ type: 'group', created_by: 2 }, { user_id: 1, role: 'admin' }, policy).react, false);
  assert.equal(capabilitiesFor({ type: 'group', created_by: 3 }, { user_id: 1, role: 'member' }, policy).react, true);
});

test('all roles apply every content matrix and media parent/child rule', () => {
  const group = { type: 'group', created_by: 1 };
  const members = { owner: { user_id: 1, role: 'admin' }, admin: { user_id: 2, role: 'admin' }, member: { user_id: 3, role: 'member' } };
  for (const role of ROLE_NAMES) for (let mask = 0; mask < 32; mask += 1) {
    const policy = { version: 1, ...defaultPolicy(), ...Object.fromEntries(ROLE_PERMISSION_KEYS.map((key, i) => [role === 'member' ? `members_can_${key}` : `${role === 'admin' ? 'admins' : 'owner'}_can_${key}`, !!(mask & (1 << i))])) };
    const caps = capabilitiesFor(group, members[role], policy, true);
    assert.equal(caps.role, role);
    assert.equal(caps.send_text_messages, policy[role === 'member' ? 'members_can_send_text_messages' : `${role === 'admin' ? 'admins' : 'owner'}_can_send_text_messages`]);
    const prefix = role === 'member' ? 'members_can_' : `${role === 'admin' ? 'admins' : 'owner'}_can_`;
    assert.equal(caps.send_media, policy[`${prefix}send_media`]);
    assert.equal(caps.send_photos, policy[`${prefix}send_media`] && policy[`${prefix}send_photos`]);
    assert.equal(caps.send_voice_messages, policy[`${prefix}send_media`] && policy[`${prefix}send_voice_messages`]);
    assert.equal(caps.react, policy[`${prefix}react`]);
  }
});

test('every stored policy field is required and boolean', () => {
  for (const key of ALL_PERMISSION_KEYS) {
    const missing = { version: 1, ...defaultPolicy() }; delete missing[key];
    assert.throws(() => capabilitiesFor({ type: 'group', created_by: 1 }, { user_id: 1, role: 'admin' }, missing), { code: 'GROUP_POLICY_UNAVAILABLE' });
    assert.throws(() => capabilitiesFor({ type: 'group', created_by: 1 }, { user_id: 1, role: 'admin' }, { ...defaultPolicy(), version: 1, [key]: 1 }), { code: 'GROUP_POLICY_UNAVAILABLE' });
  }
});

test('strict partial patch rejects invalid versions, keys, empty patches and non-boolean values', () => {
  for (const body of [null, [], {}, { expected_version: 1 }, { expected_version: 1, role: 'admin' }, { expected_version: 1, members_can_react: 'false' }, { expected_version: 0, members_can_react: true }, { expected_version: 1.5, members_can_react: true }]) {
    assert.throws(() => parsePermissionPatch(body), { code: 'INVALID_GROUP_PERMISSION' });
  }
  assert.deepEqual(parsePermissionPatch({ expected_version: 3, members_can_react: false }), { role: 'member', permissions: { react: false }, legacy: true });
  assert.deepEqual(parsePermissionPatch({ expected_version: 3, role: 'owner', permissions: { react: false } }), { role: 'owner', permissions: { react: false } });
  for (const body of [
    { expected_version: 1, role: 'superuser', permissions: { react: false } },
    { expected_version: 1, role: 'owner', permissions: { react: false, members_can_react: true } },
    { expected_version: 1, role: 'owner', permissions: { react: 0 } },
    { expected_version: 1, role: 'owner', permissions: [] },
    { expected_version: 1, role: 'owner', permissions: { owner_can_react: false } },
  ]) assert.throws(() => parsePermissionPatch(body), { code: 'INVALID_GROUP_PERMISSION' });
});

test('classification handles captions, encoded media URLs, HEIF and conflicting metadata conservatively', () => {
  for (const file_url of ['/uploads/%63hat-images/a.%6apg', '/uploads/a.heif', '/uploads/a.HEIC?token=irrelevant']) {
    assert.ok(requiredCapabilities({ type: 'text', attachments: [{ file_url, file_type: 'application/octet-stream' }] }).includes('send_photos'));
  }
  assert.ok(requiredCapabilities({ attachments: [{ file_url: '/uploads/%63hat-voices/a.%6d4a' }] }).includes('send_voice_messages'));
  const mixed = requiredCapabilities({ content: 'caption', type: 'image', attachments: [{ file_url: '/chat-voices/a.m4a', file_type: 'audio/mp4' }] });
  assert.deepEqual(new Set(mixed), new Set(['send_text_messages', 'send_media', 'send_photos', 'send_voice_messages']));
  const unknown = requiredCapabilities({ attachments: [{ file_url: '/unknown', file_type: 'application/octet-stream' }] });
  assert.ok(unknown.includes('send_photos') && unknown.includes('send_voice_messages'));
  assert.throws(() => assertCapabilities({ send_media: true, send_photos: false }, unknown), { code: 'GROUP_PERMISSION_DENIED', permission: 'send_photos' });
});
