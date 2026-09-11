const { Op } = require('sequelize');
const { sequelize, User, Friendship, BlockedUser, Notification } = require('../models');
const { emitUserEvent } = require('../socket');
const {
  findOrCreatePrivateConversation,
} = require('../services/privateConversation.service');
const { normalizePublicUid } = require('../utils/publicUid');
const { resolveFriendIdentity } = require('../services/friendQr.service');
const { createNotificationEvent, enabled: notificationsEnabled } = require('../services/notification.service');

const userPublicAttrs = ['id', 'name', 'email', 'phone', 'username', 'avatar', 'bio', 'is_online', 'last_seen_at'];

const normalizePair = (a, b) => ({
  [Op.or]: [
    { user_id: a, friend_id: b },
    { user_id: b, friend_id: a },
  ],
});

const resolveFriendQr = async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {};
    if (payload.version !== 1) {
      return res.status(400).json({ success: false, message: 'Phien ban ma QR khong duoc ho tro.' });
    }

    const uid = normalizePublicUid(payload.uid);
    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID trong ma QR khong hop le.' });
    }

    const data = await resolveFriendIdentity(req.user.id, uid);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan cho ma QR nay.' });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const where = { id: { [Op.ne]: req.user.id } };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      attributes: userPublicAttrs,
      limit: Math.min(Number(req.query.limit) || 20, 50),
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user_id: req.user.id }, { friend_id: req.user.id }],
        status: 'accepted',
      },
    });

    const ids = friendships.map((item) =>
      item.user_id === req.user.id ? item.friend_id : item.user_id
    );

    const users = await User.findAll({
      where: { id: ids },
      attributes: userPublicAttrs,
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await Friendship.findAll({
      where: { friend_id: req.user.id, status: 'pending' },
      include: [{ model: User, as: 'requester', attributes: userPublicAttrs }],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

const sendFriendRequest = async (req, res, next) => {
  try {
    const friendId = Number(req.body.friend_id);

    if (friendId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Khong the ket ban voi chinh minh.' });
    }

    const request = await sequelize.transaction(async (transaction) => {
      const participantIds = [req.user.id, friendId].sort((first, second) => first - second);
      const participants = await User.findAll({
        where: { id: participantIds },
        attributes: ['id'],
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!participants.some((user) => Number(user.id) === friendId)) {
        const error = new Error('Khong tim thay nguoi dung.');
        error.status = 404;
        throw error;
      }

      const blocked = await BlockedUser.findOne({
        where: {
          [Op.or]: [
            { user_id: req.user.id, blocked_user_id: friendId },
            { user_id: friendId, blocked_user_id: req.user.id },
          ],
        },
        transaction,
      });
      if (blocked) {
        const error = new Error('Khong the ket ban vi co chan nguoi dung.');
        error.status = 403;
        throw error;
      }

      const existing = await Friendship.findOne({
        where: normalizePair(req.user.id, friendId),
        transaction,
      });
      if (existing) {
        const error = new Error('Loi moi hoac quan he ban be da ton tai.');
        error.status = 409;
        throw error;
      }

      const created = await Friendship.create({
        user_id: req.user.id,
        friend_id: friendId,
        status: 'pending',
      }, { transaction });

      if (notificationsEnabled()) {
        await createNotificationEvent({
          userId: friendId,
          actorUserId: req.user.id,
          type: 'friend_request',
          category: 'social',
          tier: 'social',
          content: `${req.user.name} da gui loi moi ket ban.`,
          title: 'Loi moi ket ban',
          body: `${req.user.name} da gui loi moi ket ban.`,
          relatedId: created.id,
          relatedType: 'friendship',
          data: { friendshipId: String(created.id) },
          eventKey: `friend-request:${created.id}:recipient:${friendId}`,
          transaction,
        });
      } else {
        await Notification.create({ user_id: friendId, type: 'friend_request', content: `${req.user.name} da gui loi moi ket ban.`, related_id: created.id }, { transaction });
      }
      return created;
    });

    res.status(201).json({ success: true, data: request, message: 'Da gui loi moi ket ban.' });
  } catch (error) {
    next(error);
  }
};

const respondFriendRequest = async (req, res, next) => {
  try {
    const nextStatus = req.body.status;
    if (!['accepted', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Trang thai loi moi khong hop le.' });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const request = await Friendship.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!request) {
        const error = new Error('Khong tim thay loi moi.');
        error.status = 404;
        throw error;
      }
      if (request.friend_id !== req.user.id) {
        const error = new Error('Khong co quyen xu ly loi moi nay.');
        error.status = 403;
        throw error;
      }

      if (request.status !== 'pending' && request.status !== nextStatus) {
        const error = new Error('Loi moi nay da duoc xu ly.');
        error.status = 409;
        throw error;
      }

      const wasAlreadyAccepted = request.status === 'accepted';
      if (nextStatus === 'rejected') {
        if (request.status === 'pending') await request.update({ status: 'rejected' }, { transaction });
        return { request, conversation: null, newlyAccepted: false, requester: null, recipient: null };
      }

      const blocked = await BlockedUser.findOne({
        where: {
          [Op.or]: [
            { user_id: request.user_id, blocked_user_id: request.friend_id },
            { user_id: request.friend_id, blocked_user_id: request.user_id },
          ],
        },
        transaction,
      });
      if (blocked) {
        const error = new Error('Khong the ket ban vi co chan nguoi dung.');
        error.status = 403;
        throw error;
      }

      if (!wasAlreadyAccepted) {
        await request.update({ status: 'accepted' }, { transaction });
      }
      const { conversation } = await findOrCreatePrivateConversation(
        request.user_id,
        request.friend_id,
        { transaction, acceptedFriendship: request }
      );
      const [requester, recipient] = await Promise.all([
        User.findByPk(request.user_id, { attributes: userPublicAttrs, transaction }),
        User.findByPk(request.friend_id, { attributes: userPublicAttrs, transaction }),
      ]);

      if (!wasAlreadyAccepted) {
        const content = `${recipient?.name || 'Nguoi dung'} da chap nhan loi moi ket ban.`;
        if (notificationsEnabled()) {
          await createNotificationEvent({
            userId: request.user_id,
            actorUserId: request.friend_id,
            type: 'friend_accepted',
            category: 'social',
            tier: 'social',
            content,
            title: 'Da ket ban',
            body: content,
            relatedId: request.id,
            relatedType: 'friendship',
            conversationId: conversation.id,
            data: { friendshipId: String(request.id), conversationId: String(conversation.id) },
            eventKey: `friend-accepted:${request.id}:recipient:${request.user_id}`,
            transaction,
          });
        } else {
          await Notification.create({ user_id: request.user_id, type: 'friend_accepted', content, related_id: request.id }, { transaction });
        }
      }

      return {
        request,
        conversation,
        newlyAccepted: !wasAlreadyAccepted,
        requester,
        recipient,
      };
    });

    if (result.newlyAccepted && result.conversation) {
      const conversationId = result.conversation.id;
      emitUserEvent(result.request.user_id, 'friendship:accepted', {
        friendshipId: result.request.id,
        conversationId,
        friend: result.recipient,
      });
      emitUserEvent(result.request.friend_id, 'friendship:accepted', {
        friendshipId: result.request.id,
        conversationId,
        friend: result.requester,
      });
      emitUserEvent(result.request.user_id, 'conversation:updated', { conversationId });
      emitUserEvent(result.request.friend_id, 'conversation:updated', { conversationId });
    }

    const friend = req.user.id === result.request.user_id ? result.recipient : result.requester;
    res.json({
      success: true,
      data: result.request,
      conversation_id: result.conversation?.id || null,
      friend: friend || null,
      message: nextStatus === 'accepted' ? 'Da chap nhan loi moi ket ban.' : 'Da tu choi loi moi ket ban.',
    });
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const blockedUserId = Number(req.body.blocked_user_id);
    if (blockedUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Khong the chan chinh minh.' });
    }

    const target = await User.findByPk(blockedUserId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    const blocked = await BlockedUser.findOrCreate({
      where: { user_id: req.user.id, blocked_user_id: blockedUserId },
      defaults: { user_id: req.user.id, blocked_user_id: blockedUserId },
    });

    await Friendship.destroy({ where: normalizePair(req.user.id, blockedUserId) });

    res.status(201).json({ success: true, data: blocked[0], message: 'Da chan nguoi dung.' });
  } catch (error) {
    next(error);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    await BlockedUser.destroy({
      where: { user_id: req.user.id, blocked_user_id: req.params.id },
    });
    res.json({ success: true, message: 'Da bo chan nguoi dung.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolveFriendQr,
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  blockUser,
  unblockUser,
};
