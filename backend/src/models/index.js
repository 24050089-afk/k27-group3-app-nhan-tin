const sequelize = require('../config/database');
const User = require('./user.model');
const Friendship = require('./friendship.model');
const BlockedUser = require('./blockedUser.model');
const Conversation = require('./conversation.model');
const ConversationMember = require('./conversationMember.model');
const ConversationPermission = require('./conversationPermission.model');
const Message = require('./message.model');
const Attachment = require('./attachment.model');
const MessageStatus = require('./messageStatus.model');
const Reaction = require('./reaction.model');
const Notification = require('./notification.model');
const PushDevice = require('./pushDevice.model');
const NotificationPreference = require('./notificationPreference.model');
const NotificationOutbox = require('./notificationOutbox.model');
const NotificationThread = require('./notificationThread.model');
const Note = require('./note.model');
const NoteView = require('./noteView.model');
const UserNearbyDiscovery = require('./userNearbyDiscovery.model');

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
Conversation.hasOne(ConversationPermission, { foreignKey: 'conversation_id', as: 'permissions', onDelete: 'CASCADE' });
ConversationPermission.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
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
Notification.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });
User.hasMany(PushDevice, { foreignKey: 'user_id', as: 'pushDevices' });
PushDevice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(NotificationPreference, { foreignKey: 'user_id', as: 'notificationPreference' });
NotificationPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.hasMany(NotificationOutbox, { foreignKey: 'notification_id', as: 'outboxEntries' });
NotificationOutbox.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification' });
PushDevice.hasMany(NotificationOutbox, { foreignKey: 'push_device_id', as: 'outboxEntries' });
NotificationOutbox.belongsTo(PushDevice, { foreignKey: 'push_device_id', as: 'pushDevice' });
User.hasMany(NotificationThread, { foreignKey: 'user_id', as: 'notificationThreads' });
NotificationThread.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Note, { foreignKey: 'author_id', as: 'notes' });
Note.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Note.hasMany(NoteView, { foreignKey: 'note_id', as: 'views', onDelete: 'CASCADE' });
NoteView.belongsTo(Note, { foreignKey: 'note_id', as: 'note' });
NoteView.belongsTo(User, { foreignKey: 'viewer_id', as: 'viewer' });

User.hasOne(UserNearbyDiscovery, {
  foreignKey: 'user_id',
  as: 'nearbyDiscovery',
  onDelete: 'CASCADE',
});
UserNearbyDiscovery.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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
  ConversationPermission,
  Message,
  Attachment,
  MessageStatus,
  Reaction,
  Notification,
  PushDevice,
  NotificationPreference,
  NotificationOutbox,
  NotificationThread,
  Note,
  NoteView,
  UserNearbyDiscovery,
};
