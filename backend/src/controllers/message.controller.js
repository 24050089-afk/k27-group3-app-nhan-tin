const {
  User,
  ConversationMember,
  Message,
  Attachment,
  MessageStatus,
  Reaction,
  Notification,
  Conversation,
  BlockedUser,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { isVideoAttachment, validateVideoAttachment, videoError } = require('../utils/videoUpload');
const { emitConversationEvent, emitUserEvent } = require('../socket');
const { createNotificationEvent, enabled: notificationsEnabled } = require('../services/notification.service');
const { canRecallMessage } = require('../utils/conversationAuthorization');
const { lockConversationAccess, loadPolicy } = require('../services/groupPermission.service');
const { capabilitiesFor, requiredCapabilities, assertCapabilities, domainError } = require('../utils/groupPermissions');

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

const VOICE_MIME_TYPES = new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a']);
const VOICE_PATH_PATTERN = /^\/uploads\/chat-voices\/([0-9a-f-]+\.m4a)$/i;

const isValidVoiceAttachment = (attachment, req) => {
  if (!attachment || !VOICE_MIME_TYPES.has(String(attachment.file_type || '').toLowerCase())) return false;
  if (attachment.thumbnail_url) return false;
  try {
    const parsed = new URL(String(attachment.file_url || ''));
    const match = parsed.pathname.match(VOICE_PATH_PATTERN);
    if (!match || parsed.host.toLowerCase() !== String(req.get('host') || '').toLowerCase()) return false;
    const voiceRoot = path.resolve(process.cwd(), 'uploads', 'chat-voices');
    const candidate = path.resolve(voiceRoot, match[1]);
    return candidate.startsWith(`${voiceRoot}${path.sep}`) && fs.existsSync(candidate);
  } catch {
    return false;
  }
};

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

    const messageType = req.body.type || 'text';
    if (messageType === 'video' && (attachments.length !== 1 || !isVideoAttachment(attachments[0]))) {
      throw videoError(415, 'INVALID_VIDEO', 'Tin nhắn video cần một video đã tải lên.');
    }
    for (const attachment of attachments) {
      if (isVideoAttachment(attachment)) await validateVideoAttachment(attachment, req);
    }
    if (messageType === 'voice' && (attachments.length !== 1 || !isValidVoiceAttachment(attachments[0], req))) {
      return res.status(400).json({ success: false, message: 'Tep ghi am khong hop le.' });
    }

    const replyToId = req.body.reply_to_id || null;
    if (replyToId) {
      const replyTarget = await Message.findOne({ where: { id: replyToId, conversation_id: conversationId } });
      if (!replyTarget) {
        return res.status(400).json({ success: false, message: 'Tin nhan tra loi khong thuoc cuoc tro chuyen.' });
      }
    }

    const result = await sequelize.transaction(async (transaction) => {
      const { conversation, members, member: currentMember } = await lockConversationAccess(conversationId, req.user.id, transaction);
      const policy = await loadPolicy(conversation, transaction);
      assertCapabilities(capabilitiesFor(conversation, currentMember, policy), requiredCapabilities({ ...req.body, attachments }));
      if (conversation.type === 'private') {
        const recipientId = members.find((item) => Number(item.user_id) !== Number(req.user.id))?.user_id;
        if (!recipientId) {
          const error = new Error('Cuoc tro chuyen rieng khong hop le.');
          error.status = 400;
          throw error;
        }
        const blocked = await BlockedUser.findOne({
          where: { [Op.or]: [{ user_id: req.user.id, blocked_user_id: recipientId }, { user_id: recipientId, blocked_user_id: req.user.id }] },
          transaction,
        });
        if (blocked) {
          const error = new Error('Khong the gui tin nhan do mot ben da chan.');
          error.status = 403;
          throw error;
        }
      }
      const message = await Message.create({
        conversation_id: conversationId,
        sender_id: req.user.id,
        content: req.body.content || '',
        type: messageType,
        reply_to_id: replyToId,
      }, { transaction });
      if (attachments.length) {
        await Attachment.bulkCreate(attachments.map((item) => ({
          message_id: message.id,
          file_url: item.file_url,
          file_type: item.file_type || null,
          size: item.size || null,
          thumbnail_url: item.thumbnail_url || null,
        })), { transaction });
      }
      await MessageStatus.bulkCreate(members.map((item) => ({
        message_id: message.id,
        user_id: item.user_id,
        status: item.user_id === req.user.id ? 'seen' : 'sent',
        seen_at: item.user_id === req.user.id ? new Date() : null,
      })), { transaction });
      const summary = String(req.body.content || (messageType === 'voice' ? 'Tin nhan thoai' : 'Tep dinh kem')).slice(0, 120);
      for (const item of members.filter((candidate) => Number(candidate.user_id) !== Number(req.user.id))) {
        if (notificationsEnabled()) {
          await createNotificationEvent({
            userId: item.user_id,
            actorUserId: req.user.id,
            type: replyToId ? 'message_reply' : 'new_message',
            category: 'messages',
            tier: replyToId ? 'direct' : 'conversation',
            content: `${req.user.name}: ${summary}`,
            title: conversation.type === 'group' ? (conversation.name || 'Nhom chat') : req.user.name,
            body: `${req.user.name}: ${summary}`,
            relatedId: message.id,
            relatedType: 'message',
            conversationId,
            messageId: message.id,
            data: { conversationId: String(conversationId), messageId: String(message.id) },
            collapseKey: `conversation:${conversationId}`,
            eventKey: `message:${message.id}:recipient:${item.user_id}`,
            transaction,
          });
        } else if (!item.muted) {
          await Notification.create({ user_id: item.user_id, type: 'new_message', content: `${req.user.name}: ${summary}`, related_id: message.id }, { transaction });
        }
      }
      return { message, members };
    });

    const created = await Message.findByPk(result.message.id, { include: messageInclude });
    const serialized = serializeMessage(created, req.user.id);

    emitConversationEvent(conversationId, 'message:new', { conversationId, message: serialized });
    result.members.forEach((item) => {
      emitUserEvent(item.user_id, 'conversation:updated', { conversationId, reason: 'message' });
    });

    res.status(201).json({ success: true, data: serialized, message: 'Da gui tin nhan.' });
  } catch (error) {
    next(error);
  }
};

const mutateMessage = (required, mutate, successMessage) => async (req, res, next) => {
  try {
    const initial = await Message.findByPk(req.params.id, { attributes: ['id', 'conversation_id'] });
    if (!initial) throw domainError(404, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn.');
    const result = await sequelize.transaction(async (transaction) => {
      const access = await lockConversationAccess(initial.conversation_id, req.user.id, transaction);
      if (required.length) {
        const policy = await loadPolicy(access.conversation, transaction);
        assertCapabilities(capabilitiesFor(access.conversation, access.member, policy), required);
      }
      const message = await Message.findByPk(initial.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!message || message.conversation_id !== initial.conversation_id) throw domainError(404, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn.');
      if (required.length && message.recalled) throw domainError(409, 'MESSAGE_RECALLED', 'Tin nhắn đã được thu hồi.');
      await mutate({ ...access, message, transaction, req });
      const updated = await Message.findByPk(message.id, { include: messageInclude, transaction });
      return { conversationId: message.conversation_id, message: serializeMessage(updated, req.user.id) };
    });
    emitConversationEvent(result.conversationId, 'message:updated', result);
    res.json({ success: true, data: result.message, message: successMessage });
  } catch (error) { next(error); }
};

const editMessage = mutateMessage(['send_text_messages'], async ({ message, req, transaction }) => {
  if (Number(message.sender_id) !== Number(req.user.id)) throw domainError(403, 'MESSAGE_SENDER_REQUIRED', 'Chỉ người gửi được sửa tin nhắn.');
  await message.update({ content: req.body.content, edited: true }, { transaction });
}, 'Đã sửa tin nhắn.');

const recallMessage = mutateMessage([], async ({ message, conversation, member, req, transaction }) => {
  if (!canRecallMessage({ conversationType: conversation.type, senderId: message.sender_id, userId: req.user.id, memberRole: member.role })) {
    throw domainError(403, 'MESSAGE_RECALL_DENIED', 'Không có quyền thu hồi tin nhắn.');
  }
  await message.update({ content: '', recalled: true }, { transaction });
}, 'Đã thu hồi tin nhắn.');

const reactToMessage = mutateMessage(['react'], async ({ message, req, transaction }) => {
  const [reaction] = await Reaction.findOrCreate({
    where: { message_id: message.id, user_id: req.user.id },
    defaults: { message_id: message.id, user_id: req.user.id, type: req.body.type }, transaction,
  });
  if (reaction.type !== req.body.type) await reaction.update({ type: req.body.type }, { transaction });
}, 'Đã thả cảm xúc.');

const removeReaction = mutateMessage([], async ({ message, req, transaction }) => {
  await Reaction.destroy({ where: { message_id: message.id, user_id: req.user.id }, transaction });
}, 'Đã xóa cảm xúc.');

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
    if (notificationsEnabled()) {
      await Notification.update(
        { read: true, read_at: new Date() },
        { where: { user_id: req.user.id, conversation_id: conversationId, category: 'messages', read: false } }
      );
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
