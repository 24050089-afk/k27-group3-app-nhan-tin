const { Op } = require('sequelize');
const { User, Friendship, BlockedUser } = require('../models');
const { findExistingPrivateConversation } = require('./privateConversation.service');

const QR_PUBLIC_USER_ATTRIBUTES = ['id', 'uid', 'name', 'username', 'avatar', 'bio', 'is_online'];

const friendshipPairWhere = (firstUserId, secondUserId) => ({
  [Op.or]: [
    { user_id: firstUserId, friend_id: secondUserId },
    { user_id: secondUserId, friend_id: firstUserId },
  ],
});

const serializeQrUser = (user) => ({
  id: user.id,
  uid: user.uid,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  bio: user.bio,
  is_online: Boolean(user.is_online),
});

const relationshipFromFriendship = (currentUserId, friendship) => {
  if (!friendship) return 'none';
  if (friendship.status === 'rejected') return 'rejected';
  if (friendship.status === 'accepted') return 'accepted';
  if (friendship.status !== 'pending') return 'none';
  return Number(friendship.user_id) === Number(currentUserId)
    ? 'outgoing_pending'
    : 'incoming_pending';
};

const resolveFriendIdentity = async (currentUserId, uid, options = {}) => {
  const UserModel = options.UserModel || User;
  const FriendshipModel = options.FriendshipModel || Friendship;
  const BlockedUserModel = options.BlockedUserModel || BlockedUser;
  const findConversation = options.findConversation || findExistingPrivateConversation;
  const target = await UserModel.findOne({
    where: { uid },
    attributes: QR_PUBLIC_USER_ATTRIBUTES,
  });
  if (!target) return null;

  let relationship = 'none';
  let friendshipId = null;
  let conversationId = null;

  if (Number(target.id) === Number(currentUserId)) {
    relationship = 'self';
  } else {
    const blocked = await BlockedUserModel.findOne({
      where: {
        [Op.or]: [
          { user_id: currentUserId, blocked_user_id: target.id },
          { user_id: target.id, blocked_user_id: currentUserId },
        ],
      },
      attributes: ['id'],
    });
    if (blocked) {
      relationship = 'blocked';
    } else {
      const friendship = await FriendshipModel.findOne({
        where: friendshipPairWhere(currentUserId, target.id),
        attributes: ['id', 'user_id', 'friend_id', 'status'],
      });
      relationship = relationshipFromFriendship(currentUserId, friendship);
      if (relationship !== 'none') friendshipId = friendship.id;
      if (relationship === 'accepted') {
        const conversation = await findConversation(currentUserId, target.id);
        conversationId = conversation?.id || null;
      }
    }
  }

  return {
    user: serializeQrUser(target),
    relationship,
    friendship_id: friendshipId,
    conversation_id: conversationId,
  };
};

module.exports = {
  QR_PUBLIC_USER_ATTRIBUTES,
  friendshipPairWhere,
  serializeQrUser,
  relationshipFromFriendship,
  resolveFriendIdentity,
};
