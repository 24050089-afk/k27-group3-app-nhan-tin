import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupPermissionsHarness, groupSnapshot } from './groupPermissions.renderHarness.mjs';

test('S01 renders three roles and marks the current role as Bạn', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({
    data: groupSnapshot({
      version: 3,
      member: { send_media: false },
      admin: { send_photos: false },
    }),
  });
  harness.mount();
  await harness.act();

  for (const role of ['Thành viên', 'Quản trị viên', 'Nhóm trưởng']) {
    assert.ok(harness.byLabel(role, { startsWith: true }));
  }
  const ownerRole = harness.byLabel('Nhóm trưởng', { startsWith: true });
  assert.match(ownerRole.props.accessibilityLabel, /Bạn/);
  assert.match(ownerRole.props.accessibilityLabel, /5\/5 mục được phép/);
  assert.match(harness.text(), /5\/5 mục được phép/);
  const memberRole = harness.byLabel('Thành viên', { startsWith: true });
  await harness.press(memberRole);
  assert.equal(harness.byLabel('Thành viên', { startsWith: true }).props.accessibilityState.selected, true);
  assert.match(harness.byLabel('Thành viên', { startsWith: true }).props.accessibilityLabel, /2\/5 mục được phép/);
  assert.match(harness.text(), /THÀNH VIÊN CÓ THỂ LÀM GÌ\?/);
  assert.match(harness.text(), /2\/5 mục được phép/);
  await harness.press(harness.byLabel('Quản trị viên', { startsWith: true }));
  assert.equal(harness.byLabel('Quản trị viên', { startsWith: true }).props.accessibilityState.selected, true);
  assert.match(harness.byLabel('Quản trị viên', { startsWith: true }).props.accessibilityLabel, /4\/5 mục được phép/);
  assert.match(harness.text(), /QUẢN TRỊ VIÊN CÓ THỂ LÀM GÌ\?/);
  assert.match(harness.text(), /4\/5 mục được phép/);
  await harness.press(harness.byLabel('Nhóm trưởng', { startsWith: true }));
  assert.equal(harness.byLabel('Nhóm trưởng', { startsWith: true }).props.accessibilityState.selected, true);
  assert.match(harness.byLabel('Nhóm trưởng', { startsWith: true }).props.accessibilityLabel, /5\/5 mục được phép/);
  assert.match(harness.text(), /NHÓM TRƯỞNG CÓ THỂ LÀM GÌ\?/);
  assert.match(harness.text(), /5\/5 mục được phép/);
});

test('S02 toggle updates the visible draft and enables save', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.checked, true);
  assert.match(harness.text(), /5\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  await harness.press(harness.byLabel('Gửi tin nhắn'));
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);
});

test('S03 dirty draft locks role selector and cancel restores clean controls', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Gửi tin nhắn'));
  const headingBeforeAttempt = harness.text();
  const otherRole = harness.byLabel('Quản trị viên', { startsWith: true });
  await harness.act(() => otherRole.props.onPress());
  assert.equal(harness.byLabel('Thành viên', { startsWith: true }).props.accessibilityState.disabled, true);
  assert.equal(harness.text(), headingBeforeAttempt);
  assert.match(harness.text(), /Lưu hoặc Hủy thay đổi trước khi chuyển vai trò/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);
  await harness.press(harness.byLabel('Hủy'));
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.checked, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

async function runSimpleErrorCase(harness, error) {
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Gửi tin nhắn'));
  harness.api.enqueuePatch(() => Promise.reject(error));
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  await harness.press(harness.byLabel('Lưu thay đổi'));
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.busy, false);
}

test('S04 renders the domain message for HTTP 403', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  const error = Object.assign(new Error('Bạn không có quyền thay đổi cấu hình nhóm.'), { status: 403, code: 'GROUP_OWNER_REQUIRED' });
  await runSimpleErrorCase(harness, error);
  assert.match(harness.text(), /Bạn không có quyền thay đổi cấu hình nhóm/);
});

test('S05 renders the domain message for HTTP 404', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  const error = Object.assign(new Error('Không tìm thấy cuộc trò chuyện.'), { status: 404, code: 'CONVERSATION_NOT_FOUND' });
  await runSimpleErrorCase(harness, error);
  assert.match(harness.text(), /Không tìm thấy cuộc trò chuyện/);
});
