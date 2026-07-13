const express = require('express');
const { body } = require('express-validator');
const {
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  blockUser,
  unblockUser,
} = require('../controllers/friendship.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(protect);

router.get('/users/search', searchUsers);
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
