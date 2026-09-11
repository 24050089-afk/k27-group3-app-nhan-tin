const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  User,
  Friendship,
  BlockedUser,
  Conversation,
  ConversationMember,
  UserNearbyDiscovery,
} = require('../models');
const { relationshipFromFriendship } = require('./friendQr.service');

const PUBLIC_ATTRIBUTES = ['id', 'uid', 'name', 'username', 'avatar', 'is_online'];
const MAX_SUGGESTIONS = 20;
const MAX_NEARBY_RESULTS = 20;
const NEARBY_RADIUS_M = 10_000;
const SESSION_MS = 30 * 60 * 1000;

const normalizeId = (value) => Number(value);

const pairWhere = (userId, ids) => ({
  [Op.or]: [
    { user_id: userId, friend_id: { [Op.in]: ids } },
    { friend_id: userId, user_id: { [Op.in]: ids } },
  ],
});

const serializeUser = (user) => ({
  id: user.id,
  uid: user.uid,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  is_online: Boolean(user.is_online),
});

const getBlockedIds = async (userId) => {
  const rows = await BlockedUser.findAll({
    where: {
      [Op.or]: [{ user_id: userId }, { blocked_user_id: userId }],
    },
    attributes: ['user_id', 'blocked_user_id'],
  });
  const blocked = new Set();
  rows.forEach((row) => {
    if (Number(row.user_id) === Number(userId)) blocked.add(Number(row.blocked_user_id));
    if (Number(row.blocked_user_id) === Number(userId)) blocked.add(Number(row.user_id));
  });
  return blocked;
};

const getRelationships = async (userId, ids) => {
  if (!ids.length) return new Map();
  const rows = await Friendship.findAll({
    where: pairWhere(userId, ids),
    attributes: ['id', 'user_id', 'friend_id', 'status'],
  });
  return new Map(rows.map((row) => [
    Number(row.user_id) === Number(userId) ? Number(row.friend_id) : Number(row.user_id),
    { row, relationship: relationshipFromFriendship(userId, row) },
  ]));
};

const getAcceptedFriendIds = async (userId) => {
  const rows = await Friendship.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ user_id: userId }, { friend_id: userId }],
    },
    attributes: ['user_id', 'friend_id'],
  });
  return rows.map((row) => Number(row.user_id) === Number(userId) ? Number(row.friend_id) : Number(row.user_id));
};

const getSharedGroupScores = async (userId) => {
  const memberships = await ConversationMember.findAll({
    where: { user_id: userId },
    attributes: ['conversation_id'],
    include: [{ model: Conversation, as: 'conversation', where: { type: 'group' }, attributes: [] }],
  });
  const conversationIds = memberships.map((item) => item.conversation_id);
  if (!conversationIds.length) return new Map();

  const members = await ConversationMember.findAll({
    where: { conversation_id: conversationIds, user_id: { [Op.ne]: userId } },
    attributes: ['user_id', 'conversation_id'],
  });
  const scores = new Map();
  members.forEach((member) => {
    const id = Number(member.user_id);
    const current = scores.get(id) || { count: 0, lastConversationId: Number(member.conversation_id) };
    current.count += 1;
    current.lastConversationId = Math.max(current.lastConversationId, Number(member.conversation_id));
    scores.set(id, current);
  });
  return scores;
};

const getMutualScores = async (userId, friendIds) => {
  if (!friendIds.length) return new Map();
  const rows = await Friendship.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [
        { user_id: { [Op.in]: friendIds }, friend_id: { [Op.ne]: userId } },
        { friend_id: { [Op.in]: friendIds }, user_id: { [Op.ne]: userId } },
      ],
    },
    attributes: ['user_id', 'friend_id'],
  });
  const scores = new Map();
  rows.forEach((row) => {
    const candidate = friendIds.includes(Number(row.user_id))
      ? Number(row.friend_id)
      : Number(row.user_id);
    if (candidate === Number(userId) || friendIds.includes(candidate)) return;
    scores.set(candidate, (scores.get(candidate) || 0) + 1);
  });
  return scores;
};

const getRecentSuggestions = async (userId, { limit = 10, cursor = null } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), MAX_SUGGESTIONS);
  const blocked = await getBlockedIds(userId);
  const acceptedFriendIds = await getAcceptedFriendIds(userId);
  const [groupScores, mutualScores] = await Promise.all([
    getSharedGroupScores(userId),
    getMutualScores(userId, acceptedFriendIds),
  ]);

  const candidateIds = new Set([...groupScores.keys(), ...mutualScores.keys()]);
  acceptedFriendIds.forEach((id) => candidateIds.delete(id));
  blocked.forEach((id) => candidateIds.delete(id));
  candidateIds.delete(Number(userId));

  const ids = [...candidateIds].filter((id) => Number.isInteger(id) && id > 0);
  const relationships = await getRelationships(userId, ids);
  const rejectedIds = new Set([...relationships.entries()]
    .filter(([, value]) => value.relationship === 'rejected')
    .map(([id]) => id));
  rejectedIds.forEach((id) => candidateIds.delete(id));

  const users = await User.findAll({
    where: { id: [...candidateIds] },
    attributes: PUBLIC_ATTRIBUTES,
  });
  const data = users.map((user) => {
    const id = Number(user.id);
    const shared = groupScores.get(id)?.count || 0;
    const mutual = mutualScores.get(id) || 0;
    const relationship = relationships.get(id)?.relationship || 'none';
    const reason = mutual > 0
      ? { type: 'mutual_friends', count: mutual }
      : { type: 'shared_group', count: shared };
    return {
      user: serializeUser(user),
      relationship,
      reason,
      score: (shared * 1000) + (mutual * 100) + id,
    };
  }).sort((a, b) => b.score - a.score || a.user.id - b.user.id);

  const cursorId = cursor ? Number(cursor) : null;
  const visible = cursorId ? data.filter((item) => item.user.id < cursorId) : data;
  const page = visible.slice(0, safeLimit);
  return {
    data: page.map(({ score, ...item }) => item),
    next_cursor: page.length === safeLimit ? String(page[page.length - 1].user.id) : null,
  };
};

const quantizeCoordinate = (value) => Math.round(Number(value) * 1000) / 1000;

const validateLocation = ({ latitude, longitude, accuracy_m }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const accuracy = Number(accuracy_m);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 5000) return null;
  return { latitude: quantizeCoordinate(lat), longitude: quantizeCoordinate(lng), accuracy_m: Math.round(accuracy) };
};

const createPointWkt = ({ latitude, longitude }) => `POINT(${longitude} ${latitude})`;

const writeNearbyPresence = async (userId, normalized, now, expiresAt) => {
  await sequelize.query(`
    INSERT INTO user_nearby_discovery (
      user_id, location_point, accuracy_m, location_updated_at, expires_at, created_at, updated_at
    ) VALUES (
      :userId, ST_GeomFromText(:pointWkt, 4326, 'axis-order=long-lat'), :accuracy, :locationUpdatedAt, :expiresAt, :now, :now
    )
    ON DUPLICATE KEY UPDATE
      location_point = ST_GeomFromText(:pointWkt, 4326, 'axis-order=long-lat'),
      accuracy_m = :accuracy,
      location_updated_at = :locationUpdatedAt,
      expires_at = :expiresAt,
      updated_at = :now
  `, {
    replacements: {
      userId,
      pointWkt: createPointWkt(normalized),
      accuracy: normalized.accuracy_m,
      locationUpdatedAt: now,
      expiresAt,
      now,
    },
  });
};

const getNearbyStatus = async (userId) => {
  const row = await UserNearbyDiscovery.findOne({ where: { user_id: userId } });
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    if (row) await row.destroy();
    return { active: false, expires_at: null, location_age_band: null };
  }
  const ageMinutes = Math.floor((Date.now() - new Date(row.location_updated_at).getTime()) / 60_000);
  const location_age_band = ageMinutes < 1 ? 'just_now'
    : ageMinutes < 5 ? 'under_5_min'
      : ageMinutes < 15 ? 'under_15_min' : 'over_15_min';
  return { active: true, expires_at: row.expires_at, location_age_band };
};

const upsertNearbyPresence = async (userId, location) => {
  const normalized = validateLocation(location);
  if (!normalized) {
    const error = new Error('Do chinh xac vi tri khong du de tim nguoi gan day.');
    error.code = 'LOCATION_ACCURACY_TOO_LOW';
    error.status = 400;
    throw error;
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  await writeNearbyPresence(userId, normalized, now, expiresAt);
  return { active: true, expires_at: expiresAt, location_age_band: 'just_now' };
};

const refreshNearbyLocation = async (userId, location) => {
  const normalized = validateLocation(location);
  if (!normalized) {
    const error = new Error('Do chinh xac vi tri khong du de lam moi.');
    error.code = 'LOCATION_ACCURACY_TOO_LOW';
    error.status = 400;
    throw error;
  }
  const row = await UserNearbyDiscovery.findOne({ where: { user_id: userId } });
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    if (row) await row.destroy();
    const error = new Error('Phien tim nguoi gan day da het han.');
    error.code = 'NEARBY_SESSION_EXPIRED';
    error.status = 409;
    throw error;
  }
  const now = new Date();
  await sequelize.query(`
    UPDATE user_nearby_discovery
    SET location_point = ST_GeomFromText(:pointWkt, 4326, 'axis-order=long-lat'),
        accuracy_m = :accuracy,
        location_updated_at = :now,
        updated_at = :now
    WHERE user_id = :userId
  `, {
    replacements: {
      userId,
      pointWkt: createPointWkt(normalized),
      accuracy: normalized.accuracy_m,
      now,
    },
  });
  return getNearbyStatus(userId);
};

const distanceBand = (distanceM, uncertaintyM) => {
  const lower = Math.max(0, distanceM - uncertaintyM);
  const upper = distanceM + uncertaintyM;
  if (upper < 1000) return '<1_km';
  if (lower >= 1000 && upper < 5000) return '1_5_km';
  if (lower >= 5000 && upper <= 10000) return '5_10_km';
  return 'nearby_approximate';
};

const searchNearby = async (userId, location, { limit = 20, cursor = null } = {}) => {
  const normalized = validateLocation(location);
  if (!normalized) {
    const error = new Error('Do chinh xac vi tri khong du de tim nguoi gan day.');
    error.code = 'LOCATION_ACCURACY_TOO_LOW';
    error.status = 400;
    throw error;
  }
  const status = await getNearbyStatus(userId);
  if (!status.active) {
    const error = new Error('Phien tim nguoi gan day da het han.');
    error.code = 'NEARBY_SESSION_EXPIRED';
    error.status = 409;
    throw error;
  }
  await refreshNearbyLocation(userId, normalized);

  const latDelta = NEARBY_RADIUS_M / 111_000;
  const lngDelta = NEARBY_RADIUS_M / Math.max(111_000 * Math.cos((normalized.latitude * Math.PI) / 180), 1);
  const minLat = Math.max(-90, normalized.latitude - latDelta);
  const maxLat = Math.min(90, normalized.latitude + latDelta);
  const minLng = Math.max(-180, normalized.longitude - lngDelta);
  const maxLng = Math.min(180, normalized.longitude + lngDelta);
  const bboxWkt = `POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`;

  const rows = await sequelize.query(`
    SELECT d.user_id, d.accuracy_m,
      ST_Distance_Sphere(
        d.location_point,
        ST_GeomFromText(:pointWkt, 4326, 'axis-order=long-lat')
      ) AS distance_m,
      u.id, u.uid, u.name, u.username, u.avatar, u.is_online
    FROM user_nearby_discovery d
    INNER JOIN users u ON u.id = d.user_id
    WHERE d.expires_at > NOW()
      AND d.user_id <> :userId
      AND MBRContains(
        ST_GeomFromText(:bbox, 4326, 'axis-order=long-lat'),
        d.location_point
      )
    ORDER BY distance_m ASC, d.user_id ASC
    LIMIT 100
  `, {
    replacements: {
      userId,
      pointWkt: createPointWkt(normalized),
      bbox: bboxWkt,
    },
    type: QueryTypes.SELECT,
  });

  const ids = rows.map((row) => Number(row.user_id));
  const blocked = await getBlockedIds(userId);
  const relationships = await getRelationships(userId, ids);
  const acceptedIds = new Set(await getAcceptedFriendIds(userId));
  const sharedGroups = await getSharedGroupScores(userId);
  const trusted = new Set([...acceptedIds, ...sharedGroups.keys()]);
  const data = rows
    .filter((row) => !blocked.has(Number(row.user_id)) && trusted.has(Number(row.user_id)))
    .map((row) => {
      const id = Number(row.user_id);
      const relationship = relationships.get(id)?.relationship || 'none';
      return {
        user: serializeUser(row),
        relationship,
        distance_band: distanceBand(Number(row.distance_m), normalized.accuracy_m + Number(row.accuracy_m)),
        score: Number(row.distance_m),
      };
    })
    .filter((item) => item.relationship !== 'rejected')
    .sort((a, b) => a.score - b.score || a.user.id - b.user.id);

  const cursorId = cursor ? Number(cursor) : null;
  const visible = cursorId ? data.filter((item) => item.user.id < cursorId) : data;
  const page = visible.slice(0, Math.min(Math.max(Number(limit) || 20, 1), MAX_NEARBY_RESULTS));
  return {
    data: page.map(({ score, ...item }) => item),
    next_cursor: page.length === Math.min(Math.max(Number(limit) || 20, 1), MAX_NEARBY_RESULTS)
      ? String(page[page.length - 1].user.id) : null,
  };
};

const stopNearbyPresence = async (userId) => {
  await UserNearbyDiscovery.destroy({ where: { user_id: userId } });
};

module.exports = {
  PUBLIC_ATTRIBUTES,
  getRecentSuggestions,
  getBlockedIds,
  getRelationships,
  getNearbyStatus,
  upsertNearbyPresence,
  refreshNearbyLocation,
  searchNearby,
  stopNearbyPresence,
  validateLocation,
};
