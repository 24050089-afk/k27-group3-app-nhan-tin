const { Op } = require('sequelize');
const {
  User,
  BlockedUser,
  Conversation,
  ConversationMember,
  Message,
  Reaction,
  ConversationPermission,
  sequelize,
} = require('../models');
const { sortConversationsByActivity } = require('../utils/conversationOrder');
const { findOrCreatePrivateConversation } = require('../services/privateConversation.service');
const { createNotificationEvent, enabled: notificationsEnabled } = require('../services/notification.service');
const { emitUserEvent, removeUserFromConversation } = require('../socket');
const { canMutateConversation, isGroupOwner } = require('../utils/conversationAuthorization');
const { decorateConversations, lockConversationAccess } = require('../services/groupPermission.service');
const { defaultPolicy, domainError } = require('../utils/groupPermissions');

const userAttrs = ['id', 'name', 'email', 'phone', 'username', 'avatar', 'is_online', 'last_seen_at'];

const blockedWhere = (a, b) => ({
  [Op.or]: [
    { user_id: a, blocked_user_id: b },
    { user_id: b, blocked_user_id: a },
  ],
});

const ensureMember = async (conversationId, userId) => {
  return ConversationMember.findOne({ where: { conversation_id: conversationId, user_id: userId } });
};

const getConversationPayload = async (conversationId) => {
  return Conversation.findByPk(conversationId, {
    include: [
      {
        model: ConversationMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: userAttrs }],
      },
      {
        model: Message,
        as: 'messages',
        separate: true,
        limit: 1,
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'sender', attributes: userAttrs }],
      },
    ],
  });
};

const listConversations = async (req, res, next) => {
  try {
    const memberships = await ConversationMember.findAll({
      where: { user_id: req.user.id },
      attributes: ['conversation_id', 'pinned', 'muted', 'last_read_message_id'],
      order: [['pinned', 'DESC'], ['updated_at', 'DESC']],
    });
    const ids = memberships.map((item) => item.conversation_id);

    const conversations = await Conversation.findAll({
      where: { id: ids },
      include: [
        {
          model: ConversationMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: userAttrs }],
        },
        {
          model: Message,
          as: 'messages',
          separate: true,
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: userAttrs }],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    const membershipMap = new Map(memberships.map((item) => [item.conversation_id, item]));
    const data = conversations.map((conversation) => {
      const plain = conversation.toJSON();
      const membership = membershipMap.get(conversation.id);
      plain.me = membership?.toJSON ? membership.toJSON() : membership || null;
      plain.last_message = plain.messages?.[0] || null;
      delete plain.messages;
      return plain;
    });

    res.json({ success: true, data: sortConversationsByActivity(await decorateConversations(data, req.user.id)) });
  } catch (error) {
    next(error);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const member = await ensureMember(req.params.id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    const conversation = await getConversationPayload(req.params.id);
    if (!conversation) throw domainError(404, 'CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.');
    res.json({ success: true, data: (await decorateConversations([conversation], req.user.id))[0] });
  } catch (error) {
    next(error);
  }
};

const createPrivateConversation = async (req, res, next) => {
  try {
    const friendId = Number(req.body.friend_id);
    if (friendId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Khong the chat voi chinh minh.' });
    }

    const target = await User.findByPk(friendId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    const blocked = await BlockedUser.findOne({ where: blockedWhere(req.user.id, friendId) });
    if (blocked) {
      return res.status(403).json({ success: false, message: 'Khong the tao chat vi co chan nguoi dung.' });
    }

    const { conversation, created } = await findOrCreatePrivateConversation(req.user.id, friendId);
    res.status(created ? 201 : 200).json({
      success: true,
      data: await getConversationPayload(conversation.id),
    });
  } catch (error) {
    next(error);
  }
};

const createGroupConversation = async (req, res, next) => {
  try {
    const memberIds = [...new Set((req.body.member_ids || []).map(Number))].filter((id) => id !== req.user.id);
    if (memberIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Nhom chat can it nhat 2 thanh vien khac.' });
    }

    const users = await User.findAll({ where: { id: memberIds }, attributes: ['id'] });
    if (users.length !== memberIds.length) {
      return res.status(404).json({ success: false, message: 'Mot so thanh vien khong ton tai.' });
    }

    const conversation = await sequelize.transaction(async (transaction) => {
      const created = await Conversation.create({
      type: 'group',
      name: req.body.name,
      avatar: req.body.avatar || null,
      created_by: req.user.id,
      }, { transaction });

      await ConversationMember.bulkCreate([
        { conversation_id: created.id, user_id: req.user.id, role: 'admin' },
        ...memberIds.map((id) => ({ conversation_id: created.id, user_id: id, role: 'member' })),
      ], { transaction });
      await ConversationPermission.create({ conversation_id: created.id, ...defaultPolicy() }, { transaction });
      return created;
    });

    if (notificationsEnabled()) {
      for (const userId of memberIds) {
        await createNotificationEvent({
          userId,
          actorUserId: req.user.id,
          type: 'group_added',
          category: 'group_updates',
          tier: 'social',
          content: `Ban da duoc them vao nhom ${conversation.name}.`,
          title: 'Ban da duoc them vao nhom',
          body: conversation.name,
          relatedId: conversation.id,
          relatedType: 'conversation',
          conversationId: conversation.id,
          data: { conversationId: String(conversation.id) },
          eventKey: `group-added:${conversation.id}:recipient:${userId}`,
        });
        emitUserEvent(userId, 'conversation:updated', { conversationId: conversation.id });
      }
    }

    res.status(201).json({ success: true, data: await getConversationPayload(conversation.id) });
  } catch (error) {
    next(error);
  }
};

const updateConversation = async (req, res, next) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const { conversation, member, members } = await lockConversationAccess(req.params.id, req.user.id, transaction);
      if (conversation.type !== 'group') throw domainError(400, 'GROUP_ONLY', 'Chỉ áp dụng cho nhóm.');
      if (!canMutateConversation({ conversationType: conversation.type, memberRole: member.role })) {
        throw domainError(403, 'GROUP_ADMIN_REQUIRED', 'Chỉ quản trị viên được sửa thông tin nhóm.');
      }
      if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim())) {
        throw domainError(400, 'INVALID_GROUP_NAME', 'Tên nhóm không được để trống.');
      }
      await conversation.update({
        name: req.body.name?.trim() ?? conversation.name,
        avatar: req.body.avatar ?? conversation.avatar,
      }, { transaction });
      return { conversation, members };
    });
    result.members.forEach((member) => emitUserEvent(member.user_id, 'conversation:updated', { conversationId: result.conversation.id }));
    const data = await getConversationPayload(result.conversation.id);
    res.json({ success: true, data: (await decorateConversations([data], req.user.id))[0], message: 'Đã cập nhật nhóm.' });
  } catch (error) {
    next(error);
  }
};

const updateMyConversationSettings = async (req, res, next) => {
  try {
    const member = await ensureMember(req.params.id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    await member.update({
      muted: req.body.muted ?? member.muted,
      pinned: req.body.pinned ?? member.pinned,
    });

    res.json({ success: true, data: member, message: 'Da cap nhat cai dat chat.' });
  } catch (error) {
    next(error);
  }
};

const leaveConversation = async (req, res, next) => {
  try {
    const members = await sequelize.transaction(async (transaction) => {
      const access = await lockConversationAccess(req.params.id, req.user.id, transaction);
      if (access.conversation.type !== 'group') throw domainError(400, 'GROUP_ONLY', 'Chỉ có thể rời nhóm.');
      if (isGroupOwner({ conversationType: access.conversation.type, createdBy: access.conversation.created_by, userId: req.user.id })) {
        throw domainError(409, 'GROUP_OWNER_TRANSFER_REQUIRED', 'Nhóm trưởng chưa thể rời nhóm khi chưa chuyển quyền.');
      }
      await access.member.destroy({ transaction });
      // Keep joins and sends behind the conversation lock until eviction finishes.
      await removeUserFromConversation(req.user.id, req.params.id);
      return access.members;
    });
    members.forEach((member) => emitUserEvent(member.user_id, 'conversation:updated', { conversationId: Number(req.params.id) }));
    res.json({ success: true, message: 'Da roi khoi cuoc tro chuyen.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listConversations,
  getConversation,
  createPrivateConversation,
  createGroupConversation,
  updateConversation,
  updateMyConversationSettings,
  leaveConversation,
};
