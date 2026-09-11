const canRecallMessage = ({ conversationType, senderId, userId, memberRole }) => {
  if (Number(senderId) === Number(userId)) return true;
  return conversationType === 'group' && memberRole === 'admin';
};

const canMutateConversation = ({ conversationType, memberRole }) => (
  conversationType === 'group' && memberRole === 'admin'
);

const isGroupOwner = ({ conversationType, createdBy, userId }) => (
  conversationType === 'group' && Number(createdBy) === Number(userId)
);

module.exports = {
  canRecallMessage,
  canMutateConversation,
  isGroupOwner,
};
