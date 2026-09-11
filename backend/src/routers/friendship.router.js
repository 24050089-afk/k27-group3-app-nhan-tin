const express = require('express');
const { body } = require('express-validator');
const {
  resolveFriendQr,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  blockUser,
  unblockUser,
} = require('../controllers/friendship.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRateLimit } = require('../middlewares/rateLimit.middleware');
const {
  searchUsersHardened,
  recentSuggestions,
  nearbyStatus,
  startNearby,
  nearbySearch,
  stopNearby,
} = require('../controllers/friendDiscovery.controller');

const router = express.Router();

router.use(protect);

router.post(
  '/qr/resolve',
  createRateLimit({ windowMs: 60_000, max: 30 }),
  resolveFriendQr
);
const nearbyEnabled = (req, res, next) => {
  const enabled = process.env.NEARBY_DISCOVERY_ENABLED == null
    ? process.env.NODE_ENV !== 'production'
    : process.env.NEARBY_DISCOVERY_ENABLED === 'true';
  if (!enabled) {
    return res.status(404).json({ success: false, message: 'Tinh nang tim nguoi gan day chua duoc bat.' });
  }
  return next();
};

const userRateLimit = (max) => createRateLimit({
  windowMs: 60_000,
  max,
  keyGenerator: (req) => `user:${req.user.id}`,
});
const ipRateLimit = (max) => createRateLimit({
  windowMs: 60_000,
  max,
  keyGenerator: (req) => `ip:${req.ip}`,
});

router.get('/users/search', userRateLimit(30), ipRateLimit(30), searchUsersHardened);
router.get('/suggestions/recent', userRateLimit(20), ipRateLimit(20), recentSuggestions);
router.get('/nearby/status', nearbyEnabled, nearbyStatus);
router.put(
  '/nearby/presence',
  nearbyEnabled,
  userRateLimit(4),
  ipRateLimit(4),
  validate([
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('accuracy_m').isFloat({ gt: 0, lte: 5000 }),
  ]),
  startNearby
);
router.post(
  '/nearby/search',
  nearbyEnabled,
  userRateLimit(12),
  ipRateLimit(12),
  validate([
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('accuracy_m').isFloat({ gt: 0, lte: 5000 }),
    body('limit').optional().isInt({ min: 1, max: 20 }),
    body('cursor').optional().isString().isLength({ max: 32 }),
  ]),
  nearbySearch
);
router.delete('/nearby/presence', nearbyEnabled, stopNearby);
router.get('/friends', getFriends);
router.get('/requests', getFriendRequests);

router.post(
  '/requests',
  validate([body('friend_id').isInt({ min: 1 }).withMessage('friend_id khong hop le.')]),
  sendFriendRequest
);

router.patch(
  '/requests/:id',
  validate([body('status').isIn(['accepted', 'rejected']).withMessage('Trang thai khong hop le.')]),
  respondFriendRequest
);

router.post(
  '/blocks',
  validate([body('blocked_user_id').isInt({ min: 1 }).withMessage('blocked_user_id khong hop le.')]),
  blockUser
);

router.delete('/blocks/:id', unblockUser);

module.exports = router;
