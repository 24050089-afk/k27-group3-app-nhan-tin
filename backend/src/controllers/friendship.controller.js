const { Op } = require('sequelize');
const { User, Friendship, BlockedUser, Notification } = require('../models');

const userPublicAttrs = ['id', 'name', 'email', 'phone', 'username', 'avatar', 'bio', 'is_online', 'last_seen_at'];

const normalizePair = (a, b) => ({
  [Op.or]: [
    { user_id: a, friend_id: b },
    { user_id: b, friend_id: a },
  ],
});

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

    const target = await User.findByPk(friendId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    const blocked = await BlockedUser.findOne({
      where: {
        [Op.or]: [
          { user_id: req.user.id, blocked_user_id: friendId },
          { user_id: friendId, blocked_user_id: req.user.id },
        ],
      },
    });
    if (blocked) {
      return res.status(403).json({ success: false, message: 'Khong the ket ban vi co chan nguoi dung.' });
    }

    const existing = await Friendship.findOne({ where: normalizePair(req.user.id, friendId) });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Loi moi hoac quan he ban be da ton tai.' });
    }

    const request = await Friendship.create({
      user_id: req.user.id,
      friend_id: friendId,
      status: 'pending',
    });

    await Notification.create({
      user_id: friendId,
      type: 'friend_request',
      content: `${req.user.name} da gui loi moi ket ban.`,
      related_id: request.id,
    });

    res.status(201).json({ success: true, data: request, message: 'Da gui loi moi ket ban.' });
  } catch (error) {
    next(error);
  }
};

const respondFriendRequest = async (req, res, next) => {
  try {
    const request = await Friendship.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Khong tim thay loi moi.' });
    }
    if (request.friend_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Khong co quyen xu ly loi moi nay.' });
    }

    await request.update({ status: req.body.status });
    res.json({ success: true, data: request, message: 'Da cap nhat loi moi.' });
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
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  blockUser,
  unblockUser,
};
