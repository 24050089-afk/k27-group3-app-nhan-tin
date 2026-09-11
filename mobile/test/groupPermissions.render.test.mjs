import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createGroupPermissionsHarness, deferred, groupSnapshot } from './groupPermissions.renderHarness.mjs';

test('UX-03 finding keeps the rendered policy stable while the destination refresh is pending', { concurrency: false }, async (t) => {
  const initialConversation = groupSnapshot({ version: 3, member: { send_media: false } });
  const refreshRequest = deferred();
  const harness = createGroupPermissionsHarness({ initialConversation });
  t.after(() => harness.unmount());
  harness.api.enqueueGet(() => refreshRequest.promise);

  harness.mount();
  await harness.act();

  assert.doesNotMatch(harness.text(), /Đang tải/);
  assert.doesNotMatch(harness.text(), /Quyền chưa xác minh/);
  assert.match(harness.text(), /2\/5 mục được phép/);
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.disabled, true);

  refreshRequest.resolve({ data: groupSnapshot({ version: 4, member: { send_media: false } }) });
  await harness.act();

  assert.match(harness.text(), /2\/5 mục được phép/);
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.disabled, false);
});

test('C01 cancel restores the newest verified snapshot', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();

  await harness.press(harness.byLabel('Thả cảm xúc'));
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);

  harness.api.enqueueGet({
    data: groupSnapshot({ version: 4, member: { send_media: false } }),
  });
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 4 });
  await delay(120);
  await harness.act();

  assert.match(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.match(harness.byLabel('Thành viên', { startsWith: true }).props.accessibilityLabel, /2\/5 mục được phép/);

  await harness.press(harness.byLabel('Hủy'));
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.doesNotMatch(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.match(harness.text(), /2\/5 mục được phép/);
});

test('C02 save sends the selected role and verified version', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();

  await harness.press(harness.byLabel('Quản trị viên', { startsWith: true }));
  await harness.press(harness.byLabel('Thả cảm xúc'));
  const patch = deferred();
  harness.api.enqueuePatch(() => patch.promise);

  await harness.act(() => { harness.byLabel('Lưu thay đổi').props.onPress(); });
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.busy, true);
  assert.deepEqual(harness.api.patchCalls, [{
    id: 41,
    payload: { role: 'admin', permissions: { react: false }, expected_version: 3 },
  }]);

  patch.resolve({ data: groupSnapshot({ version: 4, admin: { react: false } }) });
  await harness.act();
  assert.match(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.busy, false);
});

test('C03 double-tap save sends exactly one request', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const patch = deferred();
  harness.api.enqueuePatch(() => patch.promise);
  const save = harness.byLabel('Lưu thay đổi');
  await harness.act(() => {
    save.props.onPress();
    save.props.onPress();
  });

  assert.equal(harness.api.patchCalls.length, 1);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.busy, true);
  patch.resolve({ data: groupSnapshot({ version: 4, member: { react: false } }) });
  await harness.act();
  assert.equal(harness.api.patchCalls.length, 1);
  assert.match(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C04a newer REST completion wins when an older PATCH finishes later', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const completions = [];
  const patch = deferred();
  harness.api.enqueuePatch(() => patch.promise.then((value) => {
    completions.push('PATCH v4');
    return value;
  }));
  await harness.act(() => { harness.byLabel('Lưu thay đổi').props.onPress(); });

  harness.api.enqueueGet(() => Promise.resolve({
    data: groupSnapshot({ version: 5, member: { send_media: false } }),
  }).then((value) => {
    completions.push('REST v5');
    return value;
  }));
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 5 });
  await delay(120);
  await harness.act();
  assert.deepEqual(completions, ['REST v5']);
  assert.match(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);

  patch.resolve({ data: groupSnapshot({ version: 4, member: { react: false } }) });
  await harness.act();
  assert.deepEqual(completions, ['REST v5', 'PATCH v4']);
  assert.doesNotMatch(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.match(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);

  await harness.press(harness.byLabel('Dùng cấu hình mới'));
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, true);
  assert.match(harness.text(), /2\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C05 a newer socket event refetches and renders the newer policy', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, true);

  harness.api.enqueueGet({ data: groupSnapshot({ version: 4, member: { react: false } }) });
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 4 });
  await delay(120);
  await harness.act();

  assert.equal(harness.api.getCalls.length, 2);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.doesNotMatch(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C07 a duplicate-version socket event accepts the latest REST representation', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 4 }) });
  harness.mount();
  await harness.act();

  harness.api.enqueueGet({ data: groupSnapshot({ version: 4, member: { react: false } }) });
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 4 });
  await delay(120);
  await harness.act();

  assert.equal(harness.api.getCalls.length, 2);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.doesNotMatch(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C08 the latest same-version REST response updates management capability', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 4 }) });
  harness.mount();
  await harness.act();
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.disabled, false);

  harness.api.enqueueGet({
    data: groupSnapshot({ version: 4, capabilities: { manage_permissions: false } }),
  });
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 4 });
  await delay(120);
  await harness.act();

  assert.equal(harness.api.getCalls.length, 2);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.disabled, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.match(harness.text(), /Nhóm đang tạm khóa thay đổi quyền/);
  assert.match(harness.text(), /5\/5 mục được phép/);
});

test('C09 a 409 refreshes the snapshot while preserving the conflicting draft', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const conflictError = Object.assign(new Error('Phiên bản quyền đã thay đổi.'), {
    status: 409,
    code: 'PERMISSION_VERSION_CONFLICT',
  });
  harness.api.enqueuePatch(() => Promise.reject(conflictError));
  harness.api.enqueueGet({ data: groupSnapshot({ version: 4, member: { send_media: false } }) });
  await harness.press(harness.byLabel('Lưu thay đổi'));

  assert.equal(harness.api.patchCalls.length, 1);
  assert.equal(harness.api.getCalls.length, 2);
  assert.match(harness.text(), /Phiên bản quyền đã thay đổi\./);
  assert.match(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.ok(harness.byLabel('Dùng cấu hình mới'));
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C10 a 503 keeps the draft and renders the latest read-only state', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const unavailable = Object.assign(new Error('Cấu hình quyền nhóm hiện không khả dụng.'), {
    status: 503,
    code: 'GROUP_POLICY_UNAVAILABLE',
  });
  harness.api.enqueuePatch(() => Promise.reject(unavailable));
  harness.api.enqueueGet({
    data: groupSnapshot({ version: 3, capabilities: { manage_permissions: false } }),
  });
  await harness.press(harness.byLabel('Lưu thay đổi'));

  assert.equal(harness.api.patchCalls.length, 1);
  assert.match(harness.text(), /Cấu hình quyền nhóm hiện không khả dụng\./);
  assert.doesNotMatch(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.disabled, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.match(harness.text(), /Nhóm đang tạm khóa thay đổi quyền/);
});

test('C11 offline state disables save and sends no mutation', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);

  await harness.act(() => harness.socket.setConnected(false));
  const save = harness.byLabel('Lưu thay đổi');
  assert.equal(save.props.accessibilityState.disabled, true);
  assert.match(harness.text(), /Bạn đang ngoại tuyến\. Kết nối lại để lưu thay đổi\./);
  await harness.act(() => { save.props.onPress(); });
  assert.equal(harness.api.patchCalls.length, 0);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
});

test('C12 a timeout keeps the draft and never retries the mutation', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const timeout = Object.assign(new Error('Yêu cầu đã hết thời gian chờ.'), {
    code: 'ECONNABORTED',
  });
  harness.api.enqueuePatch(() => Promise.reject(timeout));
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  await harness.press(harness.byLabel('Lưu thay đổi'));
  await delay(150);
  await harness.act();

  assert.equal(harness.api.patchCalls.length, 1);
  assert.equal(harness.api.getCalls.length, 2);
  assert.match(harness.text(), /Yêu cầu đã hết thời gian chờ\./);
  assert.doesNotMatch(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.busy, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);
});

test('C04b an older REST completion cannot roll back a completed PATCH', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));

  const completions = [];
  const oldRest = deferred();
  harness.api.enqueueGet(() => oldRest.promise.then((value) => {
    completions.push('REST v3');
    return value;
  }));
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 3 });
  await delay(120);
  await harness.act();
  assert.equal(harness.api.getCalls.length, 2);

  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  await harness.act(() => harness.socket.setConnected(true));
  assert.equal(harness.api.getCalls.length, 3);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);

  harness.api.enqueuePatch(() => Promise.resolve({
    data: groupSnapshot({ version: 4, member: { react: false } }),
  }).then((value) => {
    completions.push('PATCH v4');
    return value;
  }));
  await harness.press(harness.byLabel('Lưu thay đổi'));
  assert.deepEqual(completions, ['PATCH v4']);
  assert.match(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);

  oldRest.resolve({ data: groupSnapshot({ version: 3, member: { react: true } }) });
  await harness.act();
  assert.deepEqual(completions, ['PATCH v4', 'REST v3']);
  assert.match(harness.text(), /Đã lưu quyền trong nhóm\./);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C06 an older socket representation cannot roll back the rendered policy', { concurrency: false }, async (t) => {
  const harness = createGroupPermissionsHarness();
  t.after(() => harness.unmount());
  const current = groupSnapshot({ version: 4, member: { react: false } });
  current.member_permissions = { version: 4 };
  harness.api.enqueueGet({ data: current });
  harness.mount();
  await harness.act();
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);

  const stale = groupSnapshot({ version: 3, member: { react: true } });
  stale.member_permissions = { version: 3 };
  harness.api.enqueueGet({ data: stale });
  harness.socket.emit('conversation:permissions_updated', { conversationId: 41, version: 3 });
  await delay(120);
  await harness.act();

  assert.equal(harness.api.getCalls.length, 2);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.doesNotMatch(harness.text(), /Quyền vừa thay đổi trên thiết bị khác/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
});

test('C13 switching accounts removes the previous account draft and snapshot', { concurrency: false }, async (t) => {
  const initialConversation = groupSnapshot({ version: 2 });
  const harness = createGroupPermissionsHarness({ user: { id: 1 }, initialConversation });
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Gửi tin nhắn'));
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);

  const accountBRequest = deferred();
  harness.api.enqueueGet(() => accountBRequest.promise);
  harness.rerender({ nextUser: { id: 2 } });
  await harness.act();
  assert.match(harness.text(), /Đang tải/);
  assert.doesNotMatch(harness.text(), /4\/5 mục được phép/);

  const accountBSnapshot = groupSnapshot({ version: 8, member: { send_media: false } });
  accountBSnapshot.created_by = 2;
  accountBRequest.resolve({ data: accountBSnapshot });
  await harness.act();

  assert.deepEqual(harness.api.getCalls, [41, 41]);
  assert.match(harness.text(), /2\/5 mục được phép/);
  assert.equal(harness.byLabel('Gửi tin nhắn').props.accessibilityState.checked, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.doesNotMatch(harness.text(), /Lưu hoặc Hủy thay đổi trước khi chuyển vai trò/);
});

test('C14 switching conversations removes the previous conversation draft and snapshot', { concurrency: false }, async (t) => {
  const initialConversation = groupSnapshot({ id: 41, version: 2 });
  const harness = createGroupPermissionsHarness({ conversationId: 41, initialConversation });
  t.after(() => harness.unmount());
  harness.api.enqueueGet({ data: groupSnapshot({ id: 41, version: 3 }) });
  harness.mount();
  await harness.act();
  await harness.press(harness.byLabel('Thả cảm xúc'));
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, false);
  assert.match(harness.text(), /4\/5 mục được phép/);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, false);

  const conversationBRequest = deferred();
  harness.api.enqueueGet(() => conversationBRequest.promise);
  harness.rerender({ nextConversationId: 42 });
  await harness.act();
  assert.match(harness.text(), /Đang tải/);
  assert.doesNotMatch(harness.text(), /4\/5 mục được phép/);

  conversationBRequest.resolve({
    data: groupSnapshot({ id: 42, version: 9, member: { send_media: false } }),
  });
  await harness.act();

  assert.deepEqual(harness.api.getCalls, [41, 42]);
  assert.match(harness.text(), /2\/5 mục được phép/);
  assert.equal(harness.byLabel('Thả cảm xúc').props.accessibilityState.checked, true);
  assert.equal(harness.byLabel('Lưu thay đổi').props.accessibilityState.disabled, true);
  assert.doesNotMatch(harness.text(), /Lưu hoặc Hủy thay đổi trước khi chuyển vai trò/);
});
