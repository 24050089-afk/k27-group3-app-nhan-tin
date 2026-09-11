// Explicit opt-in; never use configuration from .env or a developer's database.
const test = require('node:test');
const assert = require('node:assert/strict');
if (process.env.PROXY_GROUP_TEST !== '1') throw new Error('Run with PROXY_GROUP_TEST=1 against the dedicated test container.');
Object.assign(process.env, {
  NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: '33479', DB_NAME: 'proxy_permissions_test',
  DB_USER: 'root', DB_PASSWORD: 'proxy_test_only', JWT_SECRET: 'isolated-group-test-only',
  GROUP_PERMISSIONS_MANAGEMENT_ENABLED: 'true', NOTIFICATIONS_V2_ENABLED: 'false', PUSH_NOTIFICATIONS_ENABLED: 'false',
});
const express = require('express');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: connectSocket } = require('../../../mobile/node_modules/socket.io-client');
const models = require('../../src/models');
const { sequelize, User, Conversation, ConversationMember, ConversationPermission, Message, Reaction } = models;
const { initSocket } = require('../../src/socket');
const { prepare, status, backfill } = require('../../scripts/migrate-group-permissions');
const { defaultPolicy } = require('../../src/utils/groupPermissions');
const { generatePublicUid } = require('../../src/utils/publicUid');
const { lockConversationAccess } = require('../../src/services/groupPermission.service');
const app = express();
app.use(express.json());
app.use('/api/conversations', require('../../src/routers/conversation.router'));
app.use('/api/messages', require('../../src/routers/message.router'));
app.use(require('../../src/middlewares/error.middleware'));
const server = http.createServer(app);
const io = new Server(server);
initSocket(io);
let base, users, group, privateChat;
const sockets = [];
const token = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET);
async function request(user, method, path, body) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${token(user)}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...(await response.json()) };
}
async function policy(patch) {
  const row = await ConversationPermission.findByPk(group.id);
  const legacy = Object.fromEntries(Object.entries(patch).filter(([key]) => key.startsWith('members_can_')));
  return request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, { expected_version: row.version, ...legacy });
}
async function socketFor(user) {
  const socket = connectSocket(base, { auth: { token: token(user) }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); setTimeout(() => reject(new Error('Socket connection timeout')), 5000).unref(); });
  return socket;
}
const join = (socket, id) => socket.timeout(3000).emitWithAck('conversation:join', { conversationId: id });

test.before(async () => {
  assert.equal(sequelize.config.database, 'proxy_permissions_test');
  assert.equal(Number(sequelize.config.port), 33479);
  // Fresh synthetic container only. No force/alter and no live schema bootstrap.
  await sequelize.authenticate();
  for (const model of sequelize.modelManager.getModelsTopoSortedByForeignKey().reverse()) {
    if (model !== ConversationPermission) await model.sync();
  }
  await prepare();
  await prepare();
  await sequelize.query('ALTER TABLE conversation_permissions DROP COLUMN owner_can_react');
  await prepare();
  assert.equal((await status()).ready, true);
  const unique = `${Date.now()}`;
  users = await Promise.all(Array.from({ length: 5 }, (_, i) => User.create({ uid: generatePublicUid(), name: `Fixture ${i}`, email: `group-${unique}-${i}@example.test`, password: 'Synthetic-test-123!', role: i === 4 ? 'admin' : 'user' })));
  const fixture = async (type) => {
    const conversation = await Conversation.create({ type, name: type === 'group' ? 'Permission fixture' : null, created_by: users[0].id });
    await ConversationMember.bulkCreate([0, 1, 2].map((i) => ({ conversation_id: conversation.id, user_id: users[i].id, role: i === 0 || i === 2 ? 'admin' : 'member' })));
    return conversation;
  };
  group = await fixture('group');
  privateChat = await fixture('private');
  process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED = 'false';
  process.argv.push('--before-activation');
  try {
    await backfill();
    await backfill();
    assert.equal((await status()).ready, true);
    assert.equal(await ConversationPermission.count({ where: { conversation_id: privateChat.id } }), 0);
  } finally {
    process.argv.splice(process.argv.indexOf('--before-activation'), 1);
    process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED = 'true';
  }
  await ConversationPermission.update({ members_can_react: false, admins_can_react: false, owner_can_react: false, version: 7 }, { where: { conversation_id: group.id } });
  await sequelize.query('ALTER TABLE conversation_permissions DROP COLUMN admins_can_send_media');
  await prepare();
  const preserved = await ConversationPermission.findByPk(group.id);
  assert.equal(preserved.members_can_react, false);
  assert.equal(preserved.admins_can_react, false);
  assert.equal(preserved.owner_can_react, false);
  assert.equal(preserved.admins_can_send_media, true);
  assert.equal(preserved.version, 7);
  await ConversationPermission.update({ members_can_react: true, admins_can_react: true, owner_can_react: true, version: 1 }, { where: { conversation_id: group.id } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  await new Promise((resolve) => io.close(resolve));
  await sequelize.close();
});

test('real API membership, owner-only management, strict validation and private compatibility', async () => {
  const path = `/conversations/${group.id}/permissions`;
  assert.equal((await request(users[1], 'PATCH', path, { expected_version: 1, members_can_react: false })).status, 403);
  assert.equal((await request(users[4], 'PATCH', path, { expected_version: 1, members_can_react: false })).status, 404);
  assert.equal((await request(users[0], 'PATCH', `/conversations/${privateChat.id}/permissions`, { expected_version: 1, members_can_react: false })).code, 'GROUP_ONLY');
  assert.equal((await request(users[0], 'PATCH', path, { expected_version: 1, members_can_react: 'false' })).status, 400);
  const read = await request(users[1], 'GET', `/conversations/${group.id}`);
  assert.equal(read.data.my_capabilities.manage_permissions, false);
  assert.equal(read.data.my_capabilities.send_text_messages, true);
  assert.equal((await request(users[0], 'GET', `/conversations/${privateChat.id}`)).data.member_permissions, null);
  assert.equal((await request(users[0], 'DELETE', `/conversations/${group.id}/members/me`)).code, 'GROUP_OWNER_TRANSFER_REQUIRED');
});

test('role PATCH changes only the selected role and capabilities follow the caller role', async () => {
  let row = await ConversationPermission.findByPk(group.id);
  const ownerMessage = await request(users[0], 'POST', `/conversations/${group.id}/messages`, { content: 'owner baseline' });
  assert.equal(ownerMessage.status, 201, JSON.stringify(ownerMessage));
  const ownerPatch = await request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, {
    expected_version: row.version, role: 'owner', permissions: { send_text_messages: false, send_media: false, send_photos: false, send_voice_messages: false, react: false },
  });
  assert.equal(ownerPatch.status, 200, JSON.stringify(ownerPatch));
  assert.equal(ownerPatch.data.role_permissions.owner.react, false);
  assert.equal(ownerPatch.data.role_permissions.admin.react, true);
  const ownerRead = await request(users[0], 'GET', `/conversations/${group.id}`);
  const adminRead = await request(users[2], 'GET', `/conversations/${group.id}`);
  assert.equal(adminRead.data.my_capabilities.role, 'admin');
  assert.equal(ownerRead.data.my_capabilities.react, false);
  assert.equal(ownerRead.data.my_capabilities.send_text_messages, false);
  assert.equal(adminRead.data.my_capabilities.react, true);
  assert.equal((await request(users[0], 'POST', `/conversations/${group.id}/messages`, { content: 'owner denied' })).code, 'GROUP_PERMISSION_DENIED');
  assert.equal((await request(users[0], 'PATCH', `/messages/${ownerMessage.data.id}`, { content: 'owner edit denied' })).code, 'GROUP_PERMISSION_DENIED');
  assert.equal((await request(users[0], 'POST', `/messages/${ownerMessage.data.id}/reactions`, { type: 'heart' })).code, 'GROUP_PERMISSION_DENIED');
  row = await ConversationPermission.findByPk(group.id);
  const adminMessage = await request(users[2], 'POST', `/conversations/${group.id}/messages`, { content: 'admin baseline' });
  assert.equal(adminMessage.status, 201, JSON.stringify(adminMessage));
  const adminOff = await request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, {
    expected_version: row.version, role: 'admin', permissions: { send_text_messages: false, send_media: false, send_photos: false, send_voice_messages: false, react: false },
  });
  assert.equal(adminOff.status, 200, JSON.stringify(adminOff));
  assert.equal((await request(users[2], 'POST', `/conversations/${group.id}/messages`, { content: 'admin denied' })).code, 'GROUP_PERMISSION_DENIED');
  assert.equal((await request(users[2], 'PATCH', `/messages/${adminMessage.data.id}`, { content: 'admin edit denied' })).code, 'GROUP_PERMISSION_DENIED');
  assert.equal((await request(users[2], 'POST', `/messages/${adminMessage.data.id}/reactions`, { type: 'heart' })).code, 'GROUP_PERMISSION_DENIED');
  row = await ConversationPermission.findByPk(group.id);
  const sameVersion = row.version;
  const crossRole = await Promise.all([
    request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, { expected_version: sameVersion, role: 'owner', permissions: { react: true } }),
    request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, { expected_version: sameVersion, role: 'admin', permissions: { react: false } }),
  ]);
  assert.deepEqual(crossRole.map((item) => item.status).sort(), [200, 409]);
  row = await ConversationPermission.findByPk(group.id);
  assert.equal(row.version, sameVersion + 1);
  assert.equal((await request(users[2], 'PATCH', `/conversations/${group.id}/permissions`, {
    expected_version: row.version, role: 'owner', permissions: { react: true },
  })).status, 403);
  row = await ConversationPermission.findByPk(group.id);
  const restored = await request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, {
    expected_version: row.version, role: 'owner', permissions: { send_text_messages: true, send_media: true, send_photos: true, send_voice_messages: true, react: true },
  });
  assert.equal(restored.status, 200, JSON.stringify(restored));
});

test('two concurrent PATCH requests with one version commit exactly once', async () => {
  const row = await ConversationPermission.findByPk(group.id);
  const originalVersion = row.version;
  const replies = await Promise.all([true, false].map((value) => request(users[0], 'PATCH', `/conversations/${group.id}/permissions`, { expected_version: row.version, members_can_react: value })));
  assert.deepEqual(replies.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await row.reload()).version, originalVersion + 1);
});

test('direct send, edit and reaction enforce stored policy while management is off', async () => {
  await policy(defaultPolicy());
  const sent = await request(users[1], 'POST', `/conversations/${group.id}/messages`, { content: 'Synthetic message', type: 'text' });
  assert.equal(sent.status, 201, JSON.stringify(sent));
  assert.equal((await request(users[1], 'POST', `/messages/${sent.data.id}/reactions`, { type: 'heart' })).status, 200);
  await policy({ members_can_send_text_messages: false, members_can_send_photos: false, members_can_react: false });
  process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED = 'false';
  const before = await Message.count({ where: { conversation_id: group.id } });
  assert.equal((await request(users[1], 'POST', `/conversations/${group.id}/messages`, { content: 'denied' })).code, 'GROUP_PERMISSION_DENIED');
  assert.equal((await request(users[1], 'PATCH', `/messages/${sent.data.id}`, { content: 'edit denied' })).status, 403);
  assert.equal((await request(users[1], 'POST', `/messages/${sent.data.id}/reactions`, { type: 'like' })).status, 403);
  assert.equal((await request(users[1], 'DELETE', `/messages/${sent.data.id}/reactions/me`)).status, 200);
  assert.equal(await Reaction.count({ where: { message_id: sent.data.id } }), 0);
  const spoof = await request(users[1], 'POST', `/conversations/${group.id}/messages`, { type: 'text', attachments: [{ file_url: '/uploads/%63hat-images/a.%6apg', file_type: 'application/octet-stream', size: 10 }] });
  assert.equal(spoof.code, 'GROUP_PERMISSION_DENIED', JSON.stringify(spoof));
  assert.equal(await Message.count({ where: { conversation_id: group.id } }), before);
  assert.equal((await policy({ members_can_react: true })).code, 'GROUP_PERMISSION_MANAGEMENT_DISABLED');
  assert.equal((await request(users[0], 'POST', `/conversations/${group.id}/messages`, { content: 'owner allowed' })).status, 201);
  process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED = 'true';
  assert.equal((await request(users[1], 'PATCH', `/messages/${sent.data.id}/recall`)).status, 200);
  await policy(defaultPolicy());
  assert.equal((await request(users[1], 'PATCH', `/messages/${sent.data.id}`, { content: 'cannot restore' })).code, 'MESSAGE_RECALLED');
});

test('missing policy keeps reads available but denies sends; group creation is atomic', async () => {
  await ConversationPermission.destroy({ where: { conversation_id: group.id } });
  const read = await request(users[1], 'GET', `/conversations/${group.id}`);
  assert.equal(read.status, 200);
  assert.equal(read.data.permissions_status, 'unavailable');
  assert.equal(read.data.my_capabilities, null);
  assert.equal((await request(users[0], 'POST', `/conversations/${group.id}/messages`, { content: 'unavailable' })).code, 'GROUP_POLICY_UNAVAILABLE');
  await ConversationPermission.create({ conversation_id: group.id, ...defaultPolicy() });
  const created = await request(users[0], 'POST', '/conversations/groups', { name: 'Created via API', member_ids: [users[1].id, users[2].id] });
  assert.equal(created.status, 201, JSON.stringify(created));
  assert.equal(await ConversationPermission.count({ where: { conversation_id: created.data.id } }), 1);
  ConversationPermission.addHook('beforeCreate', 'injected-group-failure', () => { throw new Error('Injected isolated fixture failure'); });
  try {
    const before = await Conversation.count();
    assert.equal((await request(users[0], 'POST', '/conversations/groups', { name: 'Must roll back', member_ids: [users[1].id, users[2].id] })).status, 500);
    assert.equal(await Conversation.count(), before);
  } finally { ConversationPermission.removeHook('beforeCreate', 'injected-group-failure'); }
  assert.equal((await status()).ready, true);
});

test('send waits for a concurrent permission transaction and uses committed restriction', async () => {
  const transaction = await sequelize.transaction();
  await lockConversationAccess(group.id, users[0].id, transaction);
  await ConversationPermission.update({ members_can_send_text_messages: false }, { where: { conversation_id: group.id }, transaction });
  const pending = request(users[1], 'POST', `/conversations/${group.id}/messages`, { content: 'must wait for commit' });
  await transaction.commit();
  assert.equal((await pending).code, 'GROUP_PERMISSION_DENIED');
  await policy(defaultPolicy());
});

test('private creator cannot recall the other sender; group admin bypass does not grant policy management', async () => {
  const received = await request(users[1], 'POST', `/conversations/${privateChat.id}/messages`, { content: 'private fixture' });
  assert.equal(received.status, 201);
  assert.equal((await request(users[0], 'PATCH', `/messages/${received.data.id}/recall`)).status, 403);
  assert.equal((await Message.findByPk(received.data.id)).recalled, false);
  assert.equal((await request(users[1], 'PATCH', `/messages/${received.data.id}/recall`)).status, 200);
  await ConversationMember.update({ role: 'admin' }, { where: { conversation_id: group.id, user_id: users[2].id } });
  await policy({ members_can_send_text_messages: false });
  assert.equal((await request(users[2], 'POST', `/conversations/${group.id}/messages`, { content: 'admin fixture' })).status, 201);
  const row = await ConversationPermission.findByPk(group.id);
  assert.equal((await request(users[2], 'PATCH', `/conversations/${group.id}/permissions`, { expected_version: row.version, members_can_send_text_messages: true })).status, 403);
  assert.equal((await request(users[3], 'DELETE', `/messages/${received.data.id}/reactions/me`)).status, 404);
  await policy(defaultPolicy());
});

test('policy event is an invalidation signal and member REST refresh receives updated capabilities', async () => {
  const memberSocket = await socketFor(users[1]);
  await join(memberSocket, group.id);
  const eventPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Policy event timeout')), 3000);
    memberSocket.once('conversation:permissions_updated', (event) => { clearTimeout(timer); resolve(event); });
  });
  const updated = await policy({ members_can_react: false });
  const event = await eventPromise;
  assert.equal(event.version, updated.data.member_permissions.version);
  assert.deepEqual(Object.keys(event).sort(), ['changedKeys', 'conversationId', 'version']);
  assert.equal((await request(users[1], 'GET', `/conversations/${group.id}`)).data.my_capabilities.react, false);
  await policy(defaultPolicy());
});

test('multiple sockets lose room access when member leaves and cannot rejoin', { timeout: 15000 }, async () => {
  const a = await socketFor(users[2]);
  const b = await socketFor(users[2]);
  const outsider = await socketFor(users[3]);
  await join(a, group.id); await join(b, group.id);
  assert.equal((await join(outsider, group.id)).success, false);
  const room = `conversation:${group.id}`;
  assert.ok(io.sockets.adapter.rooms.get(room)?.has(a.id));
  const serverSocket = io.sockets.sockets.get(a.id);
  const originalLeave = serverSocket.leave.bind(serverSocket);
  let releaseEviction, evictionStarted;
  const held = new Promise((resolve) => { releaseEviction = resolve; });
  const started = new Promise((resolve) => { evictionStarted = resolve; });
  serverSocket.leave = async (target) => {
    if (target === room) { evictionStarted(); await held; }
    return originalLeave(target);
  };
  const leaving = request(users[2], 'DELETE', `/conversations/${group.id}/members/me`);
  await started;
  // An independent connection still sees membership: leave has not committed ahead of eviction.
  assert.ok(await ConversationMember.findOne({ where: { conversation_id: group.id, user_id: users[2].id } }));
  const sending = request(users[0], 'POST', `/conversations/${group.id}/messages`, { content: 'after eviction' });
  releaseEviction();
  assert.equal((await leaving).status, 200);
  assert.equal((await sending).status, 201);
  assert.equal(io.sockets.adapter.rooms.get(room)?.has(a.id) || false, false);
  assert.equal(io.sockets.adapter.rooms.get(room)?.has(b.id) || false, false);
  assert.equal((await join(a, group.id)).success, false);
  assert.equal((await request(users[2], 'POST', `/conversations/${group.id}/messages`, { content: 'left' })).status, 404);
});
