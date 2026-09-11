import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupSettingsHarness } from './groupSettings.renderHarness.mjs';
import { groupSnapshot } from './groupPermissions.renderHarness.mjs';

test('S06 owner keeps the permission-management entry when content permissions are disabled', { concurrency: false }, async (t) => {
  const group = {
    ...groupSnapshot({
      capabilities: {
        role: 'owner',
        manage_permissions: true,
        send_text_messages: false,
        send_media: false,
        send_voice_messages: false,
      },
    }),
    name: 'Nhóm kiểm thử',
    members: [{ user_id: 1, role: 'admin', user: { id: 1, name: 'Owner' } }],
  };
  const harness = createGroupSettingsHarness({ group, user: { id: 1 } });
  t.after(() => harness.unmount());
  harness.mount();
  await harness.act();

  const entry = harness.byLabel('Quyền trong nhóm');
  assert.match(harness.text(), /Quyền trong nhóm/);
  assert.match(harness.text(), /Quyền của bạn: 1\/5 mục được phép/);
  assert.match(harness.text(), /Theo vai trò/);
  assert.equal(entry.props.accessibilityState.disabled, false);

  await harness.act(() => entry.props.onPress());
  assert.deepEqual(harness.environment.navigationCalls, [['GroupPermissions', {
    conversationId: 41,
    initialConversation: group,
    initialUserId: 1,
  }]]);
});

test('group settings renders shared image and video counts and opens each library', { concurrency: false }, async (t) => {
  const group = {
    ...groupSnapshot(),
    name: 'Nhóm kiểm thử',
    members: [{ user_id: 1, role: 'admin', user: { id: 1, name: 'Owner' } }],
  };
  const harness = createGroupSettingsHarness({
    group,
    user: { id: 1 },
    conversationId: 52,
    mediaCounts: { images: 7, videos: 4 },
  });
  t.after(() => harness.unmount());
  harness.mount();
  await harness.act();

  assert.match(harness.text(), /NỘI DUNG ĐÃ CHIA SẺ/);
  assert.deepEqual(harness.environment.mediaCalls, [[52, { type: 'image', page: 1, limit: 1 }]]);

  const images = harness.byLabel('Ảnh');
  const videos = harness.byLabel('Video');
  assert.match(harness.text(), /Ảnh7Video4/);

  await harness.act(() => images.props.onPress());
  await harness.act(() => videos.props.onPress());
  assert.deepEqual(harness.environment.navigationCalls, [
    ['SharedMedia', { conversationId: 52, type: 'image' }],
    ['SharedMedia', { conversationId: 52, type: 'video' }],
  ]);
});
