const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Notification,
  NotificationPreference,
  PushDevice,
  NotificationOutbox,
  NotificationThread,
  ConversationMember,
} = require('../models');
const { emitUserEvent } = require('../socket');
const { decryptPushToken } = require('./pushTokenCrypto.service');

const enabled = () => process.env.NOTIFICATIONS_ENABLED === 'true';
const pushEnabled = () => process.env.PUSH_ENABLED === 'true';
const asId = (value) => (value === null || value === undefined ? null : String(value));

const defaultPreferences = {
  push_messages: true,
  push_social: true,
  push_group_updates: true,
  hide_message_preview: false,
  dnd_enabled: false,
  dnd_start_minutes: null,
  dnd_end_minutes: null,
  timezone: null,
};

const getOrCreatePreferences = async (userId, transaction) => {
  const [preferences] = await NotificationPreference.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId, ...defaultPreferences },
    transaction,
  });
  return preferences;
};

const isDndActive = (preferences, now = new Date()) => {
  if (!preferences?.dnd_enabled || preferences.dnd_start_minutes === null || preferences.dnd_end_minutes === null) return false;
  let minutes = now.getHours() * 60 + now.getMinutes();
  if (preferences.timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: preferences.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
      const hour = Number(parts.find((part) => part.type === 'hour')?.value);
      const minute = Number(parts.find((part) => part.type === 'minute')?.value);
      if (Number.isInteger(hour) && Number.isInteger(minute)) minutes = hour * 60 + minute;
    } catch {
      // An invalid IANA timezone is treated as the server timezone until the user updates it.
    }
  }
  const start = preferences.dnd_start_minutes;
  const end = preferences.dnd_end_minutes;
  return start === end ? true : start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
};

const getPushPolicy = async ({ userId, category, tier, conversationId, transaction }) => {
  if (tier === 'critical') return { allow: true, hidePreview: false };
  const preferences = await getOrCreatePreferences(userId, transaction);
  if (isDndActive(preferences)) return { allow: false, hidePreview: preferences.hide_message_preview };
  if (category === 'messages' && !preferences.push_messages) return { allow: false, hidePreview: preferences.hide_message_preview };
  if (category === 'social' && !preferences.push_social) return { allow: false, hidePreview: preferences.hide_message_preview };
  if (category === 'group_updates' && !preferences.push_group_updates) return { allow: false, hidePreview: preferences.hide_message_preview };
  if (conversationId) {
    const member = await ConversationMember.findOne({ where: { user_id: userId, conversation_id: conversationId }, transaction });
    if (!member || member.muted) return { allow: false, hidePreview: preferences.hide_message_preview };
  }
  return { allow: true, hidePreview: preferences.hide_message_preview };
};

const createEventKey = ({ eventKey, type, userId, actorUserId, relatedId, conversationId }) => {
  if (eventKey) return eventKey;
  const raw = [type, userId, actorUserId || '', relatedId || '', conversationId || ''].join(':');
  return `v1:${crypto.createHash('sha256').update(raw).digest('hex')}`;
};

const safePayload = (notification) => ({
  v: 1,
  notificationId: asId(notification.id),
  type: notification.type,
  category: notification.category,
  conversationId: asId(notification.conversation_id),
  messageId: asId(notification.message_id),
  relatedId: asId(notification.related_id),
  relatedType: notification.related_type,
});

const createNotificationEvent = async ({
  userId,
  actorUserId = null,
  type,
  category,
  tier,
  content,
  title,
  body,
  relatedId = null,
  relatedType,
  conversationId = null,
  messageId = null,
  data = null,
  collapseKey = null,
  eventKey = null,
  transaction,
}) => {
  if (!enabled()) return null;
  const key = createEventKey({ eventKey, type, userId, actorUserId, relatedId, conversationId });
  const [notification, created] = await Notification.findOrCreate({
    where: { user_id: userId, event_key: key },
    defaults: {
      user_id: userId,
      actor_user_id: actorUserId,
      type,
      category,
      tier,
      content: String(content || body || title || 'Thong bao').slice(0, 255),
      related_id: relatedId,
      related_type: relatedType,
      conversation_id: conversationId,
      message_id: messageId,
      title: String(title || 'Thong bao').slice(0, 120),
      body: String(body || content || '').slice(0, 255),
      data_json: data,
      event_key: key,
      collapse_key: collapseKey,
      aggregate_count: 1,
    },
    transaction,
  });
  if (!created) return notification;

  if (collapseKey) {
    const [thread] = await NotificationThread.findOrCreate({
      where: { user_id: userId, collapse_key: collapseKey },
      defaults: { user_id: userId, collapse_key: collapseKey, latest_notification_id: notification.id, unread_count: 1, last_event_at: new Date() },
      transaction,
    });
    if (thread.latest_notification_id !== notification.id) {
      await thread.update({ latest_notification_id: notification.id, unread_count: thread.unread_count + 1, last_event_at: new Date() }, { transaction });
      await notification.update({ aggregate_count: thread.unread_count + 1 }, { transaction });
    }
  }

  const emit = () => emitUserEvent(userId, 'notification:new', { notification: notification.toJSON(), unreadCountDelta: 1 });
  if (transaction?.afterCommit) transaction.afterCommit(emit);
  else emit();
  const pushPolicy = await getPushPolicy({ userId, category, tier, conversationId, transaction });
  const devices = await PushDevice.findAll({
    where: { user_id: userId, revoked_at: null, token_ciphertext: { [Op.ne]: null }, permission_status: 'granted', enabled: true },
    transaction,
  });
  const payload = safePayload(notification);
  for (const device of devices) {
    const token = decryptPushToken(device.token_ciphertext);
    if (!token) {
      await device.update({ enabled: false, last_error_code: 'token_decryption_failed' }, { transaction });
      continue;
    }
    await NotificationOutbox.create({
      notification_id: notification.id,
      user_id: userId,
      push_device_id: device.id,
      idempotency_key: `${notification.id}:${device.id}`,
      payload_json: {
        deviceId: String(device.id),
        title: pushPolicy.hidePreview && category === 'messages' ? 'Tin nhan moi' : notification.title,
        body: pushPolicy.hidePreview && category === 'messages' ? 'Ban co mot tin nhan moi.' : notification.body,
        data: payload,
        collapseId: notification.collapse_key || undefined,
        channelId: category === 'messages' ? 'messages' : 'social',
        sound: 'default',
      },
      status: pushPolicy.allow && pushEnabled() ? 'pending' : 'suppressed',
      available_at: new Date(),
    }, { transaction });
  }
  return notification;
};

module.exports = {
  enabled,
  defaultPreferences,
  getOrCreatePreferences,
  createNotificationEvent,
  safePayload,
};
