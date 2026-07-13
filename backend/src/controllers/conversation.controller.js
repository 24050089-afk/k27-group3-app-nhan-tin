const { Op } = require('sequelize');
const {
  User,
  Friendship,
  BlockedUser,
  Conversation,
  ConversationMember,
  Message,
  Reaction,
} = require('../models');

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
      plain.me = membershipMap.get(conversation.id);
      plain.last_message = plain.messages?.[0] || null;
      delete plain.messages;
      return plain;
    });

    res.json({ success: true, data });
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
    res.json({ success: true, data: conversation });
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

    const accepted = await Friendship.findOne({
      where: {
        status: 'accepted',
        [Op.or]: [
          { user_id: req.user.id, friend_id: friendId },
          { user_id: friendId, friend_id: req.user.id },
        ],
      },
    });
    if (!accepted) {
      return res.status(403).json({ success: false, message: 'Chi co the tao chat rieng voi ban be.' });
    }

    const myMemberships = await ConversationMember.findAll({ where: { user_id: req.user.id } });
    const candidateIds = myMemberships.map((item) => item.conversation_id);
    const existing = await Conversation.findOne({
      where: { id: candidateIds, type: 'private' },
      include: [{
        model: ConversationMember,
        as: 'members',
        where: { user_id: friendId },
      }],
    });

    if (existing) {
      return res.json({ success: true, data: await getConversationPayload(existing.id) });
    }

    const conversation = await Conversation.create({ type: 'private', created_by: req.user.id });
    await ConversationMember.bulkCreate([
      { conversation_id: conversation.id, user_id: req.user.id, role: 'admin' },
      { conversation_id: conversation.id, user_id: friendId, role: 'member' },
    ]);

    res.status(201).json({ success: true, data: await getConversationPayload(conversation.id) });
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

    const conversation = await Conversation.create({
      type: 'group',
      name: req.body.name,
      avatar: req.body.avatar || null,
      created_by: req.user.id,
    });

    await ConversationMember.bulkCreate([
      { conversation_id: conversation.id, user_id: req.user.id, role: 'admin' },
      ...memberIds.map((id) => ({ conversation_id: conversation.id, user_id: id, role: 'member' })),
    ]);

    res.status(201).json({ success: true, data: await getConversationPayload(conversation.id) });
  } catch (error) {
    next(error);
  }
};

const updateConversation = async (req, res, next) => {
  try {
    const member = await ensureMember(req.params.id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }
    if (member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chi admin nhom moi co quyen cap nhat.' });
    }

    const conversation = await Conversation.findByPk(req.params.id);
    await conversation.update({
      name: req.body.name ?? conversation.name,
      avatar: req.body.avatar ?? conversation.avatar,
    });

    res.json({ success: true, data: await getConversationPayload(conversation.id), message: 'Da cap nhat chat.' });
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
    const member = await ensureMember(req.params.id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    await member.destroy();
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
