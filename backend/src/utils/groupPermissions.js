const PERMISSION_KEYS = Object.freeze([
  'members_can_send_text_messages',
  'members_can_send_media',
  'members_can_send_photos',
  'members_can_send_voice_messages',
  'members_can_react',
]);
const ROLE_NAMES = Object.freeze(['owner', 'admin', 'member']);
const ROLE_PERMISSION_KEYS = Object.freeze(['send_text_messages', 'send_media', 'send_photos', 'send_voice_messages', 'react']);
const ROLE_COLUMN_KEYS = Object.freeze(Object.fromEntries(ROLE_NAMES.map((role) => [role, Object.fromEntries(ROLE_PERMISSION_KEYS.map((key) => [key, role === 'member' ? `members_can_${key}` : `${role === 'admin' ? 'admins' : 'owner'}_can_${key}`]))])));
const ALL_PERMISSION_KEYS = Object.freeze([...new Set([...PERMISSION_KEYS, ...ROLE_NAMES.flatMap((role) => Object.values(ROLE_COLUMN_KEYS[role]))])]);
const defaultPolicy = () => Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, true]));
const domainError = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });

function validatePolicy(policy) {
  if (!policy || !Number.isSafeInteger(policy.version) || policy.version < 1
    || ALL_PERMISSION_KEYS.some((key) => typeof policy[key] !== 'boolean')) {
    throw domainError(503, 'GROUP_POLICY_UNAVAILABLE', 'Chưa xác minh được quyền của nhóm. Vui lòng thử lại.');
  }
  return policy;
}

function parsePermissionPatch(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object'
    || !Number.isSafeInteger(body.expected_version) || body.expected_version < 1
    || Object.keys(body).some((key) => key !== 'expected_version' && key !== 'role' && key !== 'permissions' && !PERMISSION_KEYS.includes(key))) {
    throw domainError(400, 'INVALID_GROUP_PERMISSION', 'Cấu hình quyền không hợp lệ.');
  }
  const isRolePatch = Object.hasOwn(body, 'role') || Object.hasOwn(body, 'permissions');
  if (isRolePatch && (PERMISSION_KEYS.some((key) => Object.hasOwn(body, key)) || !ROLE_NAMES.includes(body.role)
    || !body.permissions || Array.isArray(body.permissions) || typeof body.permissions !== 'object'
    || !Object.keys(body.permissions).length || Object.keys(body.permissions).some((key) => !ROLE_PERMISSION_KEYS.includes(key) || typeof body.permissions[key] !== 'boolean'))) {
    throw domainError(400, 'INVALID_GROUP_PERMISSION', 'Cấu hình quyền không hợp lệ.');
  }
  if (!isRolePatch && !Object.keys(body).some((key) => PERMISSION_KEYS.includes(key))) throw domainError(400, 'INVALID_GROUP_PERMISSION', 'Chưa có quyền nào cần cập nhật.');
  const patch = {};
  for (const key of PERMISSION_KEYS) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== 'boolean') throw domainError(400, 'INVALID_GROUP_PERMISSION', 'Quyền phải là bật hoặc tắt.');
    patch[key] = body[key];
  }
  if (isRolePatch) return { role: body.role, permissions: { ...body.permissions } };
  if (!Object.keys(patch).length) throw domainError(400, 'INVALID_GROUP_PERMISSION', 'Chưa có quyền nào cần cập nhật.');
  return { role: 'member', permissions: Object.fromEntries(Object.entries(patch).map(([key, value]) => [key.replace(/^members_can_/, ''), value])) , legacy: true };
}

function capabilitiesFor(conversation, member, policy, managementEnabled = false) {
  if (!member) throw domainError(404, 'CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.');
  const group = conversation.type === 'group';
  if (group) validatePolicy(policy);
  const owner = group && Number(conversation.created_by) === Number(member.user_id);
  const role = owner ? 'owner' : member.role === 'admin' ? 'admin' : 'member';
  const roleColumns = ROLE_COLUMN_KEYS[role];
  const allow = (key) => policy[roleColumns[key]];
  return {
    manage_permissions: owner && managementEnabled,
    send_text_messages: group ? allow('send_text_messages') : true,
    send_media: group ? allow('send_media') : true,
    send_photos: group ? allow('send_media') && allow('send_photos') : true,
    send_voice_messages: group ? allow('send_media') && allow('send_voice_messages') : true,
    react: group ? allow('react') : true,
    role,
  };
}

function rolePermissions(policy) {
  validatePolicy(policy);
  return { version: policy.version, ...Object.fromEntries(ROLE_NAMES.map((role) => [role, Object.fromEntries(ROLE_PERMISSION_KEYS.map((key) => [key, policy[ROLE_COLUMN_KEYS[role][key]]]))])) };
}

function requiredCapabilities(payload) {
  const required = new Set();
  if (String(payload.content || '').trim()) required.add('send_text_messages');
  if (payload.type && payload.type !== 'text') required.add('send_media');
  if (payload.type === 'image') required.add('send_photos');
  if (payload.type === 'voice') required.add('send_voice_messages');
  for (const attachment of payload.attachments || []) {
    if (!attachment || typeof attachment !== 'object') throw domainError(400, 'INVALID_ATTACHMENT', 'Tệp đính kèm không hợp lệ.');
    required.add('send_media');
    const mime = String(attachment.file_type || '').toLowerCase();
    let pathname = '';
    try { pathname = decodeURIComponent(new URL(attachment.file_url, 'http://local.invalid').pathname).toLowerCase(); } catch { /* Ambiguous metadata requires both media capabilities below. */ }
    const photo = mime.startsWith('image/') || /\/chat-images\/|\.(png|jpe?g|heic|heif|webp|gif|avif|bmp|svg)$/.test(pathname);
    const voice = mime.startsWith('audio/') || /\/chat-voices\/|\.(m4a|mp3|aac|wav|ogg|opus|flac|webm)$/.test(pathname);
    if (photo || (!photo && !voice)) required.add('send_photos');
    if (voice || (!photo && !voice)) required.add('send_voice_messages');
    if (attachment.thumbnail_url) required.add('send_photos');
  }
  return [...required];
}

function assertCapabilities(capabilities, required) {
  const denied = required.find((key) => capabilities[key] !== true);
  if (denied) throw domainError(403, 'GROUP_PERMISSION_DENIED', 'Nhóm trưởng đã giới hạn thao tác này.', { permission: denied });
}

module.exports = { PERMISSION_KEYS, ROLE_NAMES, ROLE_PERMISSION_KEYS, ROLE_COLUMN_KEYS, ALL_PERMISSION_KEYS, defaultPolicy, domainError, validatePolicy, parsePermissionPatch, capabilitiesFor, rolePermissions, requiredCapabilities, assertCapabilities };
