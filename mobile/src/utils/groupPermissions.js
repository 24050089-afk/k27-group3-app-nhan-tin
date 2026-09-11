export const PERMISSION_FIELDS = Object.freeze([
  { key: 'members_can_send_text_messages', label: 'Gửi tin nhắn', icon: 'chatbubble-outline' },
  { key: 'members_can_send_media', label: 'Gửi phương tiện', icon: 'images-outline' },
  { key: 'members_can_send_photos', label: 'Ảnh', icon: 'image-outline' },
  { key: 'members_can_send_voice_messages', label: 'Tin nhắn thoại', icon: 'mic-outline' },
  { key: 'members_can_react', label: 'Thả cảm xúc', icon: 'heart-outline' },
]);
export const ROLE_PERMISSION_FIELDS = Object.freeze([
  { key: 'send_text_messages', label: 'Gửi tin nhắn', icon: 'chatbubble-outline' },
  { key: 'send_media', label: 'Gửi phương tiện', icon: 'images-outline' },
  { key: 'send_photos', label: 'Ảnh', icon: 'image-outline' },
  { key: 'send_voice_messages', label: 'Tin nhắn thoại', icon: 'mic-outline' },
  { key: 'react', label: 'Thả cảm xúc', icon: 'heart-outline' },
]);

export const GROUP_ROLES = Object.freeze([
  { key: 'member', label: 'Thành viên' },
  { key: 'admin', label: 'Quản trị viên' },
  { key: 'owner', label: 'Nhóm trưởng' },
]);

export const permissionCount = (policy) => {
  const rolePolicy = Object.hasOwn(policy || {}, 'send_text_messages');
  const keys = rolePolicy ? ROLE_PERMISSION_FIELDS.map(({ key }) => key) : PERMISSION_FIELDS.map(({ key }) => key);
  if (keys.some((key) => typeof policy?.[key] !== 'boolean')) return null;
  return PERMISSION_FIELDS.filter(({ key }) => {
    const roleKey = key.replace(/^members_can_/, '').replace('members_can_', '');
    if (rolePolicy) {
      if (['send_photos', 'send_voice_messages'].includes(roleKey)) return policy?.send_media && policy?.[roleKey];
      return policy?.[roleKey] === true;
    }
    if (['members_can_send_photos', 'members_can_send_voice_messages'].includes(key)) return policy?.members_can_send_media && policy?.[key];
    return policy?.[key] === true;
  }).length;
};

export const permissionCountLabel = (policy) => {
  const count = permissionCount(policy);
  return count === null ? 'Chưa xác minh' : `${count}/5 mục được phép`;
};

export const reactionRoleSummary = (conversation) => {
  if (conversation?.role_permissions) {
    const states = GROUP_ROLES.map(({ key, label }) => ({ label, value: conversation.role_permissions?.[key]?.react }));
    if (states.some(({ value }) => typeof value !== 'boolean')) return 'Chưa xác minh';
    const enabled = states.filter(({ value }) => value).map(({ label }) => label);
    if (enabled.length === GROUP_ROLES.length) return 'Mọi vai trò';
    if (!enabled.length) return 'Đang tắt cho mọi vai trò';
    return enabled.join(', ');
  }
  const memberReact = conversation?.member_permissions?.members_can_react;
  if (typeof memberReact !== 'boolean') return 'Chưa xác minh';
  return memberReact ? 'Thành viên' : 'Đang tắt cho Thành viên';
};

export const permissionChanges = (saved, draft) => Object.fromEntries(
  PERMISSION_FIELDS.filter(({ key }) => typeof draft?.[key] === 'boolean' && draft[key] !== saved?.[key])
    .map(({ key }) => [key, draft[key]]),
);

export function conversationCapabilities(conversation) {
  if (conversation?.my_capabilities) return conversation.my_capabilities;
  // Compatibility for private conversations from an older backend only.
  const allowed = conversation?.type === 'private';
  return { manage_permissions: false, send_text_messages: allowed, send_media: allowed, send_photos: allowed, send_voice_messages: allowed, react: allowed };
}

export function canSendPayload(conversation, payload) {
  const capabilities = conversationCapabilities(conversation);
  if (String(payload.content || '').trim() && capabilities.send_text_messages !== true) return false;
  if (payload.type && payload.type !== 'text' && capabilities.send_media !== true) return false;
  if (payload.type === 'image' && capabilities.send_photos !== true) return false;
  if (payload.type === 'voice' && capabilities.send_voice_messages !== true) return false;
  for (const attachment of payload.attachments || []) {
    if (capabilities.send_media !== true) return false;
    let path = '';
    try { path = decodeURIComponent(new URL(attachment.file_url, 'http://local.invalid').pathname).toLowerCase(); } catch { /* Ambiguous media needs both permissions. */ }
    const mime = String(attachment.file_type || '').toLowerCase();
    const photo = mime.startsWith('image/') || /\/chat-images\/|\.(png|jpe?g|heic|heif|webp|gif|avif|bmp|svg)$/.test(path);
    const voice = mime.startsWith('audio/') || /\/chat-voices\/|\.(m4a|mp3|aac|wav|ogg|opus|flac|webm)$/.test(path);
    if ((photo || (!photo && !voice) || attachment.thumbnail_url) && capabilities.send_photos !== true) return false;
    if ((voice || (!photo && !voice)) && capabilities.send_voice_messages !== true) return false;
  }
  return true;
}
