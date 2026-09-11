const { Conversation, ConversationMember, ConversationPermission } = require('../models');
const { capabilitiesFor, domainError, validatePolicy, rolePermissions } = require('../utils/groupPermissions');

const managementEnabled = () => process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED === 'true';
const plainPolicy = (row) => row ? Object.assign({}, row.toJSON ? row.toJSON() : row) : null;

async function loadPolicy(conversation, transaction) {
  if (conversation.type !== 'group') return null;
  try {
    const row = await ConversationPermission.findByPk(conversation.id, {
      transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    return validatePolicy(plainPolicy(row));
  } catch (error) {
    if (error.code === 'GROUP_POLICY_UNAVAILABLE') throw error;
    throw domainError(503, 'GROUP_POLICY_UNAVAILABLE', 'Chưa xác minh được quyền của nhóm. Vui lòng thử lại.');
  }
}

async function lockConversationAccess(id, userId, transaction) {
  const conversation = await Conversation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!conversation) throw domainError(404, 'CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.');
  const members = await ConversationMember.findAll({
    where: { conversation_id: id }, order: [['user_id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE,
  });
  const member = members.find((item) => Number(item.user_id) === Number(userId));
  if (!member) throw domainError(404, 'CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.');
  return { conversation, members, member };
}

async function decorateConversations(conversations, userId) {
  const groups = conversations.filter((item) => item.type === 'group');
  let policies = [];
  if (groups.length) {
    try {
      policies = await ConversationPermission.findAll({ where: { conversation_id: groups.map((item) => item.id) } });
    } catch {
      // Reads remain available during migration; no missing policy grants write access.
    }
  }
  const policyMap = new Map(policies.map((item) => [String(item.conversation_id), plainPolicy(item)]));
  return conversations.map((item) => {
    const plain = item.toJSON ? item.toJSON() : { ...item };
    const member = plain.members?.find((entry) => Number(entry.user_id) === Number(userId));
    const policy = plain.type === 'group' ? policyMap.get(String(plain.id)) : null;
    try {
      plain.my_capabilities = capabilitiesFor(plain, member, policy, managementEnabled());
      plain.member_permissions = policy && Object.fromEntries(Object.entries(policy).filter(([key]) => key.startsWith('members_can_') || key === 'version'));
      plain.role_permissions = policy ? rolePermissions(policy) : null;
      plain.permissions_status = 'ready';
    } catch {
      plain.my_capabilities = null;
      plain.member_permissions = null;
      plain.role_permissions = null;
      plain.permissions_status = 'unavailable';
    }
    return plain;
  });
}

module.exports = { managementEnabled, loadPolicy, lockConversationAccess, decorateConversations };
