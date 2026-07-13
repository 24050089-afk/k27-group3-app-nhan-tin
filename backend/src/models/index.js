const sequelize = require('../config/database');
const User = require('./user.model');
const Friendship = require('./friendship.model');
const BlockedUser = require('./blockedUser.model');
const Conversation = require('./conversation.model');
const ConversationMember = require('./conversationMember.model');
const Message = require('./message.model');
const Attachment = require('./attachment.model');
const MessageStatus = require('./messageStatus.model');
const Reaction = require('./reaction.model');
const Notification = require('./notification.model');

// Associations
User.hasMany(Friendship, { foreignKey: 'user_id', as: 'sentFriendRequests' });
User.hasMany(Friendship, { foreignKey: 'friend_id', as: 'receivedFriendRequests' });
Friendship.belongsTo(User, { foreignKey: 'user_id', as: 'requester' });
Friendship.belongsTo(User, { foreignKey: 'friend_id', as: 'recipient' });

User.hasMany(BlockedUser, { foreignKey: 'user_id', as: 'blockedUsers' });
BlockedUser.belongsTo(User, { foreignKey: 'user_id', as: 'blocker' });
BlockedUser.belongsTo(User, { foreignKey: 'blocked_user_id', as: 'blockedUser' });

Conversation.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Conversation.hasMany(ConversationMember, { foreignKey: 'conversation_id', as: 'members' });
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
ConversationMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(ConversationMember, { foreignKey: 'user_id', as: 'conversationMemberships' });

Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(Message, { foreignKey: 'reply_to_id', as: 'replyTo', constraints: false });

Message.hasMany(Attachment, { foreignKey: 'message_id', as: 'attachments' });
Attachment.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });

Message.hasMany(MessageStatus, { foreignKey: 'message_id', as: 'statuses' });
MessageStatus.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
MessageStatus.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Message.hasMany(Reaction, { foreignKey: 'message_id', as: 'reactions' });
Reaction.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
Reaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ConversationMember.belongsTo(Message, {
  foreignKey: 'last_read_message_id',
  as: 'lastReadMessage',
  constraints: false,
});

module.exports = {
  sequelize,
  User,
  Friendship,
  BlockedUser,
  Conversation,
  ConversationMember,
  Message,
  Attachment,
  MessageStatus,
  Reaction,
  Notification,
};
