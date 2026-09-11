const { Op } = require('sequelize');
const { Notification, PushDevice, NotificationThread, sequelize } = require('../models');
const { enabled, getOrCreatePreferences } = require('../services/notification.service');
const { encryptPushToken, tokenHash } = require('../services/pushTokenCrypto.service');

const requireFeature = (res) => {
  if (enabled()) return false;
  res.status(503).json({ success: false, message: 'Tinh nang thong bao dang duoc kich hoat an toan.' });
  return true;
};

const parseCursor = (value) => {
  if (!value) return null;
  const [createdAt, id] = Buffer.from(value, 'base64url').toString('utf8').split('|');
  if (!createdAt || !Number.isInteger(Number(id))) return null;
  return { createdAt, id: Number(id) };
};
const makeCursor = (item) => Buffer.from(`${new Date(item.createdAt || item.created_at).toISOString()}|${item.id}`).toString('base64url');

const reconcileThreads = async (userId, transaction) => {
  const threads = await NotificationThread.findAll({ where: { user_id: userId }, transaction });
  for (const thread of threads) {
    const unreadCount = await Notification.count({ where: { user_id: userId, collapse_key: thread.collapse_key, read: false }, transaction });
    await thread.update({ unread_count: unreadCount }, { transaction });
  }
};

const listNotifications = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const cursor = parseCursor(req.query.cursor);
    if (req.query.cursor && !cursor) return res.status(400).json({ success: false, message: 'Cursor khong hop le.' });
    const where = { user_id: req.user.id };
    if (req.query.unread_only === 'true') where.read = false;
    if (req.query.category) where.category = req.query.category;
    if (cursor) {
      where[Op.or] = [
        { createdAt: { [Op.lt]: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), id: { [Op.lt]: cursor.id } },
      ];
    }
    const rows = await Notification.findAll({ where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map((item) => item.toJSON());
    res.json({ success: true, data, meta: { next_cursor: hasMore ? makeCursor(data[data.length - 1]) : null } });
  } catch (error) { next(error); }
};

const unreadCount = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const count = await Notification.count({ where: { user_id: req.user.id, read: false } });
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const markRead = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const updated = await sequelize.transaction(async (transaction) => {
      const notification = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!notification) return false;
      if (!notification.read) await notification.update({ read: true, read_at: new Date() }, { transaction });
      if (notification.collapse_key) await reconcileThreads(req.user.id, transaction);
      return true;
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Khong tim thay thong bao.' });
    res.json({ success: true });
  } catch (error) { next(error); }
};

const markAllRead = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const where = { user_id: req.user.id, read: false };
    if (req.body.category) where.category = req.body.category;
    if (req.body.before_id) where.id = { [Op.lte]: Number(req.body.before_id) };
    const [count] = await Notification.update({ read: true, read_at: new Date() }, { where });
    if (count) await sequelize.transaction((transaction) => reconcileThreads(req.user.id, transaction));
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const getPreferences = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const preference = await getOrCreatePreferences(req.user.id);
    res.json({ success: true, data: preference.toJSON() });
  } catch (error) { next(error); }
};

const updatePreferences = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const allowed = ['push_messages', 'push_social', 'push_group_updates', 'hide_message_preview', 'dnd_enabled', 'dnd_start_minutes', 'dnd_end_minutes', 'timezone'];
    const patch = Object.fromEntries(allowed.filter((key) => Object.prototype.hasOwnProperty.call(req.body, key)).map((key) => [key, req.body[key]]));
    if ((patch.dnd_start_minutes !== undefined && (!Number.isInteger(patch.dnd_start_minutes) || patch.dnd_start_minutes < 0 || patch.dnd_start_minutes > 1439)) || (patch.dnd_end_minutes !== undefined && (!Number.isInteger(patch.dnd_end_minutes) || patch.dnd_end_minutes < 0 || patch.dnd_end_minutes > 1439))) {
      return res.status(400).json({ success: false, message: 'Khoang thoi gian DND khong hop le.' });
    }
    if (patch.timezone) {
      try { Intl.DateTimeFormat('en-US', { timeZone: patch.timezone }); } catch { return res.status(400).json({ success: false, message: 'Mui gio khong hop le.' }); }
    }
    const preference = await getOrCreatePreferences(req.user.id);
    await preference.update(patch);
    res.json({ success: true, data: preference.toJSON() });
  } catch (error) { next(error); }
};

const upsertPushDevice = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    const installationId = String(req.params.installationId || '');
    if (!/^[A-Za-z0-9._:-]{8,191}$/.test(installationId)) return res.status(400).json({ success: false, message: 'Installation ID khong hop le.' });
    const allowed = ['platform', 'project_id', 'permission_status', 'timezone', 'locale', 'app_version'];
    const values = Object.fromEntries(allowed.filter((key) => Object.prototype.hasOwnProperty.call(req.body, key)).map((key) => [key, req.body[key]]));
    if (!['ios', 'android'].includes(values.platform)) return res.status(400).json({ success: false, message: 'Nen tang khong hop le.' });
    if (!['granted', 'denied', 'undetermined', 'unknown'].includes(values.permission_status || 'unknown')) return res.status(400).json({ success: false, message: 'Trang thai quyen khong hop le.' });
    const rawToken = typeof req.body.expo_push_token === 'string' ? req.body.expo_push_token.trim() : '';
    if (rawToken && !/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(rawToken)) return res.status(400).json({ success: false, message: 'Push token khong hop le.' });
    if (values.permission_status === 'granted' && !rawToken) return res.status(400).json({ success: false, message: 'Thieu push token cho thiet bi da cap quyen.' });
    const secureToken = rawToken ? { token_ciphertext: encryptPushToken(rawToken), token_hash: tokenHash(rawToken), enabled: true, last_registered_at: new Date(), revoked_at: null } : { enabled: false };
    const [device] = await PushDevice.findOrCreate({ where: { user_id: req.user.id, installation_id: installationId }, defaults: { user_id: req.user.id, installation_id: installationId, ...values, ...secureToken, last_seen_at: new Date() } });
    await device.update({ ...values, ...secureToken, last_seen_at: new Date() });
    res.json({ success: true, data: device.toJSON() });
  } catch (error) { next(error); }
};

const revokePushDevice = async (req, res, next) => {
  try {
    if (requireFeature(res)) return;
    await PushDevice.update({ revoked_at: new Date(), token_ciphertext: null, token_hash: null, enabled: false }, { where: { user_id: req.user.id, installation_id: req.params.installationId } });
    res.status(204).end();
  } catch (error) { next(error); }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead, getPreferences, updatePreferences, upsertPushDevice, revokePushDevice };
