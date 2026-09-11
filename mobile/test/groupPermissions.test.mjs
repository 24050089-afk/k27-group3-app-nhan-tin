import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSION_FIELDS, permissionCount, permissionCountLabel, permissionChanges, reactionRoleSummary, conversationCapabilities, canSendPayload } from '../src/utils/groupPermissions.js';

const all = Object.fromEntries(PERMISSION_FIELDS.map(({ key }) => [key, true]));
test('media parent retains child draft values and effective counter reflects disabled children', () => {
  const draft = { ...all, members_can_send_media: false };
  assert.equal(permissionCount(draft), 2);
  assert.equal(draft.members_can_send_photos, true);
  assert.deepEqual(permissionChanges(all, draft), { members_can_send_media: false });
  assert.equal(permissionCount({ ...draft, members_can_send_media: true }), 5);
  assert.deepEqual(permissionChanges(all, { ...all, version: 3, unexpected: true }), {});
});
test('permission summaries use effective values and never turn missing fields into zero', () => {
  assert.equal(permissionCount({ send_text_messages: true, send_media: false, send_photos: true, send_voice_messages: true, react: false }), 1);
  assert.equal(permissionCount({ send_text_messages: true, send_media: true, send_photos: true, react: true }), null);
  assert.equal(permissionCountLabel(null), 'Chưa xác minh');
  assert.equal(permissionCountLabel({ send_text_messages: true, send_media: false, send_photos: true, send_voice_messages: true, react: false }), '1/5 mục được phép');
});
test('reaction summary reflects all three roles and labels legacy data as member only', () => {
  const role_permissions = {
    member: { react: true }, admin: { react: false }, owner: { react: false },
  };
  assert.equal(reactionRoleSummary({ role_permissions }), 'Thành viên');
  assert.equal(reactionRoleSummary({ role_permissions: { ...role_permissions, admin: { react: true }, owner: { react: true } } }), 'Mọi vai trò');
  assert.equal(reactionRoleSummary({ role_permissions: { ...role_permissions, member: { react: false } } }), 'Đang tắt cho mọi vai trò');
  assert.equal(reactionRoleSummary({ role_permissions: { member: { react: true }, admin: {}, owner: { react: false } } }), 'Chưa xác minh');
  assert.equal(reactionRoleSummary({ member_permissions: { members_can_react: true } }), 'Thành viên');
  assert.equal(reactionRoleSummary({ member_permissions: { members_can_react: false } }), 'Đang tắt cho Thành viên');
});
test('missing group capabilities deny writes, private old-server compatibility preserves chat', () => {
  assert.equal(conversationCapabilities({ type: 'group' }).send_text_messages, false);
  assert.equal(conversationCapabilities(null).react, false);
  assert.equal(conversationCapabilities({ type: 'private' }).send_text_messages, true);
});
test('forward uses destination capabilities for mixed and encoded media payloads', () => {
  const target = { type: 'group', my_capabilities: { send_text_messages: false, send_media: true, send_photos: true, send_voice_messages: false } };
  const photo = { type: 'image', attachments: [{ file_url: '/uploads/chat-images/a.jpg' }] };
  assert.equal(canSendPayload(target, photo), true);
  assert.equal(canSendPayload(target, { ...photo, content: 'caption' }), false);
  assert.equal(canSendPayload(target, { attachments: [{ file_url: '/uploads/%63hat-voices/a.%6d4a' }] }), false);
  assert.equal(canSendPayload(target, { attachments: [{ file_url: '/unknown' }] }), false);
  assert.equal(canSendPayload({ type: 'private' }, { ...photo, content: 'caption' }), true);
});
