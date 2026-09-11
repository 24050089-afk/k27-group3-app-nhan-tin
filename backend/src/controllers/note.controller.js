const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Friendship,
  BlockedUser,
  ConversationMember,
  Message,
  Attachment,
  MessageStatus,
  Reaction,
  Notification,
  Note,
  NoteView,
} = require('../models');
const { emitConversationEvent, emitUserEvent } = require('../socket');
const { findOrCreatePrivateConversation } = require('../services/privateConversation.service');
const { createNotificationEvent, enabled: notificationsEnabled } = require('../services/notification.service');

const NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const REPLY_GRACE_MS = 60 * 60 * 1000;
const CREATE_COOLDOWN_MS = 10 * 1000;
const createAttempts = new Map();
const userAttrs = ['id', 'name', 'email', 'phone', 'username', 'avatar', 'is_online', 'last_seen_at'];
const messageInclude = [
  { model: User, as: 'sender', attributes: userAttrs },
  { model: Attachment, as: 'attachments' },
  { model: MessageStatus, as: 'statuses' },
  { model: Reaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: userAttrs }] },
  { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: userAttrs }] },
];

const blockedWhere = (a, b) => ({
  [Op.or]: [
    { user_id: a, blocked_user_id: b },
    { user_id: b, blocked_user_id: a },
  ],
});

const areFriends = async (userIdA, userIdB) => {
  if (Number(userIdA) === Number(userIdB)) return true;
  const row = await Friendship.findOne({
    where: {
      status: 'accepted',
      [Op.or]: [
        { user_id: userIdA, friend_id: userIdB },
        { user_id: userIdB, friend_id: userIdA },
      ],
    },
  });
  return !!row;
};

const isBlocked = async (userIdA, userIdB) => {
  const row = await BlockedUser.findOne({ where: blockedWhere(userIdA, userIdB) });
  return !!row;
};

const getFriendIds = async (userId) => {
  const rows = await Friendship.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ user_id: userId }, { friend_id: userId }],
    },
  });
  return rows.map((item) => Number(item.user_id) === Number(userId) ? item.friend_id : item.user_id);
};

const sanitizeText = (value) => String(value || '')
  .replace(/<[^>]*>/g, '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim();

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
};

const visibleLength = (text, emoji) => Array.from(`${text || ''}${emoji || ''}`).length;

const serializeNote = (note, viewerId) => {
  const plain = note.toJSON ? note.toJSON() : note;
  const views = plain.views || [];
  const viewedByMe = views.some((item) => Number(item.viewer_id) === Number(viewerId));
  return {
    id: plain.id,
    authorId: plain.author_id,
    authorName: plain.author?.name || '',
    authorUsername: plain.author?.username || '',
    authorAvatarUrl: plain.author?.avatar || null,
    text: plain.text,
    emoji: plain.emoji,
    audience: plain.audience,
    customAudienceIds: plain.custom_audience_ids || null,
    status: plain.status,
    createdAt: plain.created_at,
    expiresAt: plain.expires_at,
    viewedByMe,
    viewCount: views.length,
  };
};

const canViewNote = async (note, viewerId) => {
  if (!note || note.status !== 'ACTIVE') return false;
  if (new Date(note.expires_at).getTime() <= Date.now()) return false;
  if (Number(note.author_id) === Number(viewerId)) return true;
  if (await isBlocked(note.author_id, viewerId)) return false;
  if (!(await areFriends(note.author_id, viewerId))) return false;
  if (note.audience === 'CUSTOM') {
    const allowed = normalizeIdList(note.custom_audience_ids);
    return allowed.includes(Number(viewerId));
  }
  return true;
};

const expireActiveNotes = () => Note.update(
  { status: 'EXPIRED' },
  { where: { status: 'ACTIVE', expires_at: { [Op.lte]: new Date() } } }
);

const getActiveNoteByAuthor = (authorId) => Note.findOne({
  where: {
    author_id: authorId,
    status: 'ACTIVE',
    expires_at: { [Op.gt]: new Date() },
  },
  include: [
    { model: User, as: 'author', attributes: userAttrs },
    { model: NoteView, as: 'views' },
  ],
  order: [['created_at', 'DESC']],
});

const sendDirectMessage = async ({ sender, recipientId, text }) => {
  const { conversation } = await findOrCreatePrivateConversation(sender.id, recipientId);
  const message = await Message.create({
    conversation_id: conversation.id,
    sender_id: sender.id,
    content: text,
    type: 'text',
  });

  const members = await ConversationMember.findAll({ where: { conversation_id: conversation.id } });
  await MessageStatus.bulkCreate(
    members.map((item) => ({
      message_id: message.id,
      user_id: item.user_id,
      status: item.user_id === sender.id ? 'seen' : 'sent',
      seen_at: item.user_id === sender.id ? new Date() : null,
    }))
  );
  for (const item of members.filter((candidate) => Number(candidate.user_id) !== Number(sender.id))) {
    if (notificationsEnabled()) {
      await createNotificationEvent({
        userId: item.user_id,
        actorUserId: sender.id,
        type: 'new_message',
        category: 'messages',
        tier: 'conversation',
        content: `${sender.name}: ${text.slice(0, 120)}`,
        title: sender.name,
        body: `${sender.name}: ${text.slice(0, 120)}`,
        relatedId: message.id,
        relatedType: 'message',
        conversationId: conversation.id,
        messageId: message.id,
        data: { conversationId: String(conversation.id), messageId: String(message.id) },
        collapseKey: `conversation:${conversation.id}`,
        eventKey: `message:${message.id}:recipient:${item.user_id}`,
      });
    } else if (!item.muted) {
      await Notification.create({
        user_id: item.user_id,
        type: 'new_message',
        content: `${sender.name}: ${text.slice(0, 120)}`,
        related_id: message.id,
      });
    }
  }

  const created = await Message.findByPk(message.id, { include: messageInclude });
  emitConversationEvent(conversation.id, 'message:new', { conversationId: conversation.id, message: created });
  members.forEach((item) => {
    emitUserEvent(item.user_id, 'conversation:updated', { conversationId: conversation.id });
  });

  return { messageId: message.id, threadId: conversation.id };
};

const notifyAudience = async (authorId, note, eventName) => {
  const friendIds = await getFriendIds(authorId);
  const allowed = note.audience === 'CUSTOM' ? normalizeIdList(note.custom_audience_ids) : friendIds;
  const blockedRows = await BlockedUser.findAll({ where: blockedWhere(authorId, friendIds) });
  const blockedIds = new Set(blockedRows.map((item) => (
    Number(item.user_id) === Number(authorId) ? Number(item.blocked_user_id) : Number(item.user_id)
  )));
  const targetIds = friendIds.filter((id) => allowed.includes(Number(id)) && !blockedIds.has(Number(id)));
  targetIds.forEach((id) => {
    emitUserEvent(id, eventName, { noteId: note.id, authorId });
  });
  emitUserEvent(authorId, eventName, { noteId: note.id, authorId });
};

const createNote = async (req, res, next) => {
  try {
    const now = Date.now();
    const lastAttempt = createAttempts.get(req.user.id) || 0;
    if (now - lastAttempt < CREATE_COOLDOWN_MS) {
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Ban dang tao tin ghi chu qua nhanh.' });
    }

    const text = sanitizeText(req.body.text);
    const emoji = sanitizeText(req.body.emoji);
    if (!text && !emoji) {
      return res.status(400).json({ success: false, code: 'NOTE_EMPTY', message: 'Tin ghi chu can noi dung hoac emoji.' });
    }
    if (visibleLength(text, emoji) > 60) {
      return res.status(400).json({ success: false, code: 'NOTE_TEXT_TOO_LONG', message: 'Tin ghi chu toi da 60 ky tu.' });
    }

    const audience = req.body.audience === 'CUSTOM' ? 'CUSTOM' : 'ALL_FRIENDS';
    let customAudienceIds = audience === 'CUSTOM' ? normalizeIdList(req.body.custom_audience_ids) : null;
    if (audience === 'CUSTOM') {
      const friendIds = await getFriendIds(req.user.id);
      customAudienceIds = customAudienceIds.filter((id) => friendIds.includes(id) && Number(id) !== Number(req.user.id));
      if (!customAudienceIds.length) {
        return res.status(400).json({ success: false, message: 'Hay chon it nhat mot ban be co the xem tin.' });
      }
    }

    const created = await sequelize.transaction(async (transaction) => {
      await Note.update(
        { status: 'DELETED' },
        { where: { author_id: req.user.id, status: 'ACTIVE' }, transaction }
      );
      return Note.create({
        author_id: req.user.id,
        text: text || null,
        emoji: emoji || null,
        audience,
        custom_audience_ids: customAudienceIds,
        status: 'ACTIVE',
        expires_at: new Date(now + NOTE_TTL_MS),
      }, { transaction });
    });

    createAttempts.set(req.user.id, now);
    const note = await getActiveNoteByAuthor(req.user.id);
    await notifyAudience(req.user.id, note, 'note:created');
    res.status(201).json({ success: true, data: serializeNote(note, req.user.id) });
  } catch (error) {
    next(error);
  }
};

const getMyNote = async (req, res, next) => {
  try {
    await expireActiveNotes();
    const note = await getActiveNoteByAuthor(req.user.id);
    res.json({ success: true, data: note ? serializeNote(note, req.user.id) : null });
  } catch (error) {
    next(error);
  }
};

const getFeed = async (req, res, next) => {
  try {
    await expireActiveNotes();
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = Number(req.query.cursor) || null;
    const friendIds = await getFriendIds(req.user.id);
    if (!friendIds.length) {
      return res.json({ success: true, data: { items: [], nextCursor: null } });
    }

    const blockedRows = await BlockedUser.findAll({ where: blockedWhere(req.user.id, friendIds) });
    const blockedIds = new Set(blockedRows.map((item) => (
      Number(item.user_id) === Number(req.user.id) ? Number(item.blocked_user_id) : Number(item.user_id)
    )));
    const eligibleAuthorIds = friendIds.filter((id) => !blockedIds.has(Number(id)));

    const rows = await Note.findAll({
      where: {
        author_id: eligibleAuthorIds,
        status: 'ACTIVE',
        expires_at: { [Op.gt]: new Date() },
        ...(cursor ? { id: { [Op.lt]: cursor } } : {}),
      },
      include: [
        { model: User, as: 'author', attributes: userAttrs },
        { model: NoteView, as: 'views' },
      ],
      order: [['created_at', 'DESC']],
      limit: limit + 1,
    });

    const visible = rows.filter((note) => {
      if (note.audience !== 'CUSTOM') return true;
      return normalizeIdList(note.custom_audience_ids).includes(Number(req.user.id));
    });
    const items = visible.slice(0, limit).map((note) => serializeNote(note, req.user.id));
    const nextCursor = visible.length > limit ? visible[limit].id : null;
    res.json({ success: true, data: { items, nextCursor } });
  } catch (error) {
    next(error);
  }
};

const getNote = async (req, res, next) => {
  try {
    await expireActiveNotes();
    const note = await Note.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: userAttrs },
        { model: NoteView, as: 'views' },
      ],
    });
    if (!(await canViewNote(note, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen xem tin ghi chu nay.' });
    }
    if (Number(note.author_id) !== Number(req.user.id)) {
      await NoteView.upsert({ note_id: note.id, viewer_id: req.user.id, viewed_at: new Date() });
    }
    const refreshed = await Note.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: userAttrs },
        { model: NoteView, as: 'views' },
      ],
    });
    res.json({ success: true, data: serializeNote(refreshed, req.user.id) });
  } catch (error) {
    next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note || note.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin ghi chu.' });
    }
    if (Number(note.author_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Chi chu so huu moi duoc xoa tin ghi chu.' });
    }
    await note.update({ status: 'DELETED' });
    await notifyAudience(req.user.id, note, 'note:deleted');
    res.json({ success: true, message: 'Da xoa tin ghi chu.' });
  } catch (error) {
    next(error);
  }
};

const getViewers = async (req, res, next) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin ghi chu.' });
    }
    if (Number(note.author_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Chi chu so huu moi xem duoc luot xem.' });
    }
    const views = await NoteView.findAll({
      where: { note_id: note.id },
      include: [{ model: User, as: 'viewer', attributes: userAttrs }],
      order: [['viewed_at', 'DESC']],
    });
    res.json({
      success: true,
      data: views.map((item) => ({
        viewedAt: item.viewed_at,
        user: item.viewer,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const replyToNote = async (req, res, next) => {
  try {
    const message = sanitizeText(req.body.message);
    if (!message) {
      return res.status(400).json({ success: false, message: 'Noi dung tra loi khong hop le.' });
    }

    const note = await Note.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: userAttrs }],
    });
    if (!note || note.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Khong tim thay tin ghi chu.' });
    }
    const expiresAt = new Date(note.expires_at).getTime();
    if (expiresAt + REPLY_GRACE_MS <= Date.now()) {
      return res.status(410).json({ success: false, code: 'NOTE_EXPIRED', message: 'Tin ghi chu da het han.' });
    }
    if (!(await canViewNote(note, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen tra loi tin ghi chu nay.' });
    }
    if (Number(note.author_id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Khong the tra loi tin ghi chu cua chinh minh.' });
    }

    const noteText = [note.emoji, note.text].filter(Boolean).join(' ');
    const content = `Da tra loi tin ghi chu: "${noteText}"\n${message}`;
    const result = await sendDirectMessage({ sender: req.user, recipientId: note.author_id, text: content });
    res.status(201).json({ success: true, data: result, message: 'Da tra loi tin ghi chu.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getMyNote,
  getFeed,
  getNote,
  deleteNote,
  getViewers,
  replyToNote,
};
