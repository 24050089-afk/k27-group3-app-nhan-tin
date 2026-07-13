const {
  User,
  Conversation,
  ConversationMember,
  Message,
  Attachment,
  MessageStatus,
  Reaction,
  Notification,
} = require('../models');
const { Op } = require('sequelize');
const { emitConversationEvent, emitUserEvent } = require('../socket');

const userAttrs = ['id', 'name', 'email', 'phone', 'username', 'avatar', 'is_online', 'last_seen_at'];

const ensureMember = async (conversationId, userId) => {
  return ConversationMember.findOne({ where: { conversation_id: conversationId, user_id: userId } });
};

const getOutgoingStatus = (message, viewerId) => {
  const statuses = (message.statuses || []).filter((item) => item.user_id !== viewerId);
  if (statuses.length === 0) {
    return 'sent';
  }
  if (statuses.every((item) => item.status === 'seen')) {
    return 'seen';
  }
  if (statuses.every((item) => item.status === 'seen' || item.status === 'delivered')) {
    return 'delivered';
  }
  return 'sent';
};

const serializeMessage = (message, viewerId) => {
  const plain = message.toJSON ? message.toJSON() : message;
  plain.outgoing_status = plain.sender_id === viewerId ? getOutgoingStatus(plain, viewerId) : null;
  return plain;
};

const messageInclude = [
  { model: User, as: 'sender', attributes: userAttrs },
  { model: Attachment, as: 'attachments' },
  { model: MessageStatus, as: 'statuses' },
  { model: Reaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: userAttrs }] },
  { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: userAttrs }] },
];

const listMessages = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const member = await ensureMember(conversationId, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const offset = (page - 1) * limit;

    const result = await Message.findAndCountAll({
      where: { conversation_id: conversationId },
      include: messageInclude,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const messageIds = result.rows.map((item) => item.id);
    if (messageIds.length) {
      await MessageStatus.update(
        { status: 'delivered' },
        {
          where: {
            user_id: req.user.id,
            message_id: messageIds,
            status: 'sent',
          },
        }
      );
    }

    const refreshed = await Message.findAll({
      where: { id: messageIds },
      include: messageInclude,
      order: [['created_at', 'DESC']],
    });

    const data = refreshed.reverse().map((item) => serializeMessage(item, req.user.id));
    res.json({
      success: true,
      data,
      meta: {
        total: result.count,
        page,
        limit,
        totalPages: Math.ceil(result.count / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const member = await ensureMember(conversationId, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    if (!String(req.body.content || '').trim() && attachments.length === 0) {
      return res.status(400).json({ success: false, message: 'Tin nhan can noi dung hoac tep dinh kem.' });
    }

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: req.user.id,
      content: req.body.content || '',
      type: req.body.type || 'text',
      reply_to_id: req.body.reply_to_id || null,
    });

    if (attachments.length) {
      await Attachment.bulkCreate(
        attachments.map((item) => ({
          message_id: message.id,
          file_url: item.file_url,
          file_type: item.file_type || null,
          size: item.size || null,
          thumbnail_url: item.thumbnail_url || null,
        }))
      );
    }

    const members = await ConversationMember.findAll({ where: { conversation_id: conversationId } });
    await MessageStatus.bulkCreate(
      members.map((item) => ({
        message_id: message.id,
        user_id: item.user_id,
        status: item.user_id === req.user.id ? 'seen' : 'sent',
        seen_at: item.user_id === req.user.id ? new Date() : null,
      }))
    );

    await Conversation.update({ updated_at: new Date() }, { where: { id: conversationId } });
    await Notification.bulkCreate(
      members
        .filter((item) => item.user_id !== req.user.id && !item.muted)
        .map((item) => ({
          user_id: item.user_id,
          type: 'new_message',
          content: `${req.user.name}: ${String(req.body.content || 'Tep dinh kem').slice(0, 120)}`,
          related_id: message.id,
        }))
    );

    const created = await Message.findByPk(message.id, { include: messageInclude });
    const serialized = serializeMessage(created, req.user.id);

    emitConversationEvent(conversationId, 'message:new', { conversationId, message: serialized });
    members
      .filter((item) => item.user_id !== req.user.id)
      .forEach((item) => {
        emitUserEvent(item.user_id, 'conversation:updated', { conversationId });
      });

    res.status(201).json({ success: true, data: serialized, message: 'Da gui tin nhan.' });
  } catch (error) {
    next(error);
  }
};

const editMessage = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }

    const member = await ensureMember(message.conversation_id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Chi nguoi gui moi duoc sua tin nhan.' });
    }

    await message.update({ content: req.body.content, edited: true });
    const updated = await Message.findByPk(message.id, { include: messageInclude });
    const serialized = serializeMessage(updated, req.user.id);
    emitConversationEvent(message.conversation_id, 'message:updated', {
      conversationId: message.conversation_id,
      message: serialized,
    });

    res.json({
      success: true,
      data: serialized,
      message: 'Da sua tin nhan.',
    });
  } catch (error) {
    next(error);
  }
};

const recallMessage = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }

    const member = await ensureMember(message.conversation_id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }
    if (message.sender_id !== req.user.id && member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Khong co quyen thu hoi tin nhan.' });
    }

    await message.update({ content: '', recalled: true });
    const recalled = await Message.findByPk(message.id, { include: messageInclude });
    const serialized = serializeMessage(recalled, req.user.id);
    emitConversationEvent(message.conversation_id, 'message:updated', {
      conversationId: message.conversation_id,
      message: serialized,
    });

    res.json({ success: true, data: serialized, message: 'Da thu hoi tin nhan.' });
  } catch (error) {
    next(error);
  }
};

const reactToMessage = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }

    const member = await ensureMember(message.conversation_id, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }

    const [reaction] = await Reaction.findOrCreate({
      where: { message_id: message.id, user_id: req.user.id },
      defaults: { message_id: message.id, user_id: req.user.id, type: req.body.type },
    });
    if (reaction.type !== req.body.type) {
      await reaction.update({ type: req.body.type });
    }

    const updated = await Message.findByPk(message.id, { include: messageInclude });
    const serialized = serializeMessage(updated, req.user.id);
    emitConversationEvent(message.conversation_id, 'message:updated', {
      conversationId: message.conversation_id,
      message: serialized,
    });

    res.json({ success: true, data: serialized, message: 'Da tha bieu cam.' });
  } catch (error) {
    next(error);
  }
};

const removeReaction = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin nhan.' });
    }

    await Reaction.destroy({ where: { message_id: message.id, user_id: req.user.id } });
    const updated = await Message.findByPk(message.id, { include: messageInclude });
    const serialized = serializeMessage(updated, req.user.id);
    emitConversationEvent(message.conversation_id, 'message:updated', {
      conversationId: message.conversation_id,
      message: serialized,
    });
    res.json({ success: true, message: 'Da xoa bieu cam.' });
  } catch (error) {
    next(error);
  }
};

const markConversationSeen = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const member = await ensureMember(conversationId, req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Khong tim thay cuoc tro chuyen.' });
    }

    const latest = await Message.findOne({
      where: { conversation_id: conversationId },
      order: [['created_at', 'DESC']],
    });

    const conversationMessages = await Message.findAll({
      where: { conversation_id: conversationId },
      attributes: ['id'],
    });
    const messageIds = conversationMessages.map((item) => item.id);

    const [updatedStatusCount] = await MessageStatus.update(
      { status: 'seen', seen_at: new Date() },
      {
        where: {
          user_id: req.user.id,
          message_id: messageIds,
          status: { [Op.ne]: 'seen' },
        },
      }
    );
    const latestMessageId = latest?.id || null;
    const lastReadChanged = Number(member.last_read_message_id || 0) !== Number(latestMessageId || 0);
    if (lastReadChanged) {
      await member.update({ last_read_message_id: latestMessageId });
    }

    if (latest && (updatedStatusCount > 0 || lastReadChanged)) {
      emitConversationEvent(conversationId, 'conversation:seen', {
        conversationId,
        userId: req.user.id,
        messageId: latest.id,
      });
    }

    res.json({ success: true, message: 'Da danh dau da xem.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMessages,
  sendMessage,
  editMessage,
  recallMessage,
  reactToMessage,
  removeReaction,
  markConversationSeen,
};
