const { Op } = require('sequelize');
const {
  sequelize,
  Friendship,
  Conversation,
  ConversationMember,
} = require('../models');

class PrivateConversationError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = 'PrivateConversationError';
    this.code = code;
    this.status = status;
  }
}

const friendshipPairWhere = (firstUserId, secondUserId) => ({
  [Op.or]: [
    { user_id: firstUserId, friend_id: secondUserId },
    { user_id: secondUserId, friend_id: firstUserId },
  ],
});

const findExistingPrivateConversation = async (firstUserId, secondUserId, transaction) => {
  const memberships = await ConversationMember.findAll({
    where: { user_id: firstUserId },
    attributes: ['conversation_id'],
    transaction,
  });
  const candidateIds = memberships.map((item) => item.conversation_id);
  if (candidateIds.length === 0) return null;

  return Conversation.findOne({
    where: { id: candidateIds, type: 'private' },
    include: [{
      model: ConversationMember,
      as: 'members',
      where: { user_id: secondUserId },
      required: true,
      attributes: [],
    }],
    transaction,
  });
};

const findOrCreateInTransaction = async (
  firstUserId,
  secondUserId,
  transaction,
  acceptedFriendship = null
) => {
  const firstId = Number(firstUserId);
  const secondId = Number(secondUserId);
  if (!Number.isInteger(firstId) || !Number.isInteger(secondId) || firstId === secondId) {
    throw new PrivateConversationError('Khong the tao cuoc tro chuyen nay.', 'INVALID_PAIR');
  }

  let friendship = acceptedFriendship;
  if (!friendship) {
    friendship = await Friendship.findOne({
      where: { ...friendshipPairWhere(firstId, secondId), status: 'accepted' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }
  if (!friendship || friendship.status !== 'accepted') {
    throw new PrivateConversationError(
      'Chi co the tao chat rieng voi ban be.',
      'FRIENDSHIP_REQUIRED',
      403
    );
  }

  const existing = await findExistingPrivateConversation(firstId, secondId, transaction);
  if (existing) return { conversation: existing, created: false };

  const conversation = await Conversation.create(
    { type: 'private', created_by: firstId },
    { transaction }
  );
  await ConversationMember.bulkCreate([
    { conversation_id: conversation.id, user_id: firstId, role: 'admin' },
    { conversation_id: conversation.id, user_id: secondId, role: 'member' },
  ], { transaction });

  return { conversation, created: true };
};

const findOrCreatePrivateConversation = async (
  firstUserId,
  secondUserId,
  options = {}
) => {
  if (options.transaction) {
    return findOrCreateInTransaction(
      firstUserId,
      secondUserId,
      options.transaction,
      options.acceptedFriendship
    );
  }

  return sequelize.transaction((transaction) => findOrCreateInTransaction(
    firstUserId,
    secondUserId,
    transaction,
    options.acceptedFriendship
  ));
};

module.exports = {
  PrivateConversationError,
  friendshipPairWhere,
  findExistingPrivateConversation,
  findOrCreatePrivateConversation,
};
