const { Op } = require('sequelize');
const { User } = require('../models');
const {
  getRecentSuggestions,
  getNearbyStatus,
  upsertNearbyPresence,
  searchNearby,
  stopNearbyPresence,
  getBlockedIds,
  getRelationships,
} = require('../services/friendDiscovery.service');

const SEARCH_ATTRIBUTES = ['id', 'uid', 'name', 'username', 'avatar', 'is_online'];

const searchUsersHardened = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    if (!search) return res.json({ success: true, data: [] });

    const like = `%${search}%`;
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: req.user.id },
        [Op.or]: [
          { name: { [Op.like]: like } },
          { username: { [Op.like]: like } },
          { uid: { [Op.like]: like } },
          ...(search.includes('@') ? [{ email: search }] : []),
          ...(search.replace(/\D/g, '').length >= 5 ? [{ phone: search }] : []),
        ],
      },
      attributes: SEARCH_ATTRIBUTES,
      limit: Math.min(Number(req.query.limit) || 20, 50),
      order: [['name', 'ASC'], ['id', 'ASC']],
    });
    const ids = users.map((user) => Number(user.id));
    const [blocked, relationships] = await Promise.all([
      getBlockedIds(req.user.id),
      getRelationships(req.user.id, ids),
    ]);
    const data = users
      .filter((user) => !blocked.has(Number(user.id)))
      .map((user) => ({
        ...user.toJSON(),
        relationship: relationships.get(Number(user.id))?.relationship || 'none',
      }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const recentSuggestions = async (req, res, next) => {
  try {
    const result = await getRecentSuggestions(req.user.id, {
      limit: req.query.limit,
      cursor: req.query.cursor,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const nearbyStatus = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getNearbyStatus(req.user.id) });
  } catch (error) {
    next(error);
  }
};

const startNearby = async (req, res, next) => {
  try {
    res.json({ success: true, data: await upsertNearbyPresence(req.user.id, req.body) });
  } catch (error) {
    next(error);
  }
};

const nearbySearch = async (req, res, next) => {
  try {
    res.json({
      success: true,
      ...(await searchNearby(req.user.id, req.body, {
        limit: req.body.limit,
        cursor: req.body.cursor,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const stopNearby = async (req, res, next) => {
  try {
    await stopNearbyPresence(req.user.id);
    res.json({ success: true, data: { active: false } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsersHardened,
  recentSuggestions,
  nearbyStatus,
  startNearby,
  nearbySearch,
  stopNearby,
};
