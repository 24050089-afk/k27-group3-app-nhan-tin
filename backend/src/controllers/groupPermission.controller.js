const { sequelize, ConversationPermission } = require('../models');
const { lockConversationAccess, loadPolicy, managementEnabled } = require('../services/groupPermission.service');
const { parsePermissionPatch, capabilitiesFor, rolePermissions, ROLE_COLUMN_KEYS, domainError } = require('../utils/groupPermissions');
const { emitConversationEvent, emitUserEvent } = require('../socket');

async function updateGroupPermissions(req, res, next) {
  try {
    const patch = parsePermissionPatch(req.body);
    const result = await sequelize.transaction(async (transaction) => {
      const { conversation, member, members } = await lockConversationAccess(req.params.id, req.user.id, transaction);
      if (conversation.type !== 'group') throw domainError(400, 'GROUP_ONLY', 'Chỉ áp dụng cho nhóm.');
      if (Number(conversation.created_by) !== Number(req.user.id)) throw domainError(403, 'GROUP_OWNER_REQUIRED', 'Chỉ nhóm trưởng được thay đổi quyền.');
      if (!managementEnabled()) throw domainError(503, 'GROUP_PERMISSION_MANAGEMENT_DISABLED', 'Nhóm đang tạm khóa thay đổi quyền.');
      const current = await loadPolicy(conversation, transaction);
      if (current.version !== req.body.expected_version) throw domainError(409, 'PERMISSION_VERSION_CONFLICT', 'Quyền đã được thay đổi trên thiết bị khác. Hãy tải lại trước khi lưu.');
      if (current.version >= 2147483647) throw domainError(503, 'GROUP_POLICY_UNAVAILABLE', 'Không thể cập nhật quyền lúc này.');
      const columns = Object.fromEntries(Object.entries(patch.permissions).map(([key, value]) => [ROLE_COLUMN_KEYS[patch.role][key], value]));
      const policy = { ...current, ...columns, version: current.version + 1 };
      await ConversationPermission.update({ ...columns, version: policy.version }, { where: { conversation_id: conversation.id }, transaction });
      return { conversationId: conversation.id, members, policy, role: patch.role, changedKeys: Object.keys(patch.permissions), capabilities: capabilitiesFor(conversation, member, policy, true) };
    });
    const event = { conversationId: result.conversationId, version: result.policy.version, changedKeys: result.changedKeys };
    emitConversationEvent(result.conversationId, 'conversation:permissions_updated', event);
    result.members.forEach((member) => emitUserEvent(member.user_id, 'conversation:updated', event));
    res.json({ success: true, data: { member_permissions: Object.fromEntries(Object.entries(result.policy).filter(([key]) => key.startsWith('members_can_') || key === 'version')), role_permissions: rolePermissions(result.policy), my_capabilities: result.capabilities, permissions_status: 'ready' } });
  } catch (error) { next(error); }
}

module.exports = { updateGroupPermissions };
