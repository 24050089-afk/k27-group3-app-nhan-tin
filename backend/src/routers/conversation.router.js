const express = require('express');
const { body } = require('express-validator');
const {
  listConversations,
  getConversation,
  createPrivateConversation,
  createGroupConversation,
  updateConversation,
  updateMyConversationSettings,
  leaveConversation,
} = require('../controllers/conversation.controller');
const {
  listMessages,
  sendMessage,
  markConversationSeen,
} = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');
const { updateGroupPermissions } = require('../controllers/groupPermission.controller');
const { listConversationMedia } = require('../controllers/conversationMedia.controller');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(protect);

router.get('/', listConversations);
router.post(
  '/private',
  validate([body('friend_id').isInt({ min: 1 }).withMessage('friend_id khong hop le.')]),
  createPrivateConversation
);
router.post(
  '/groups',
  validate([
    body('name').notEmpty().isLength({ max: 120 }).withMessage('Ten nhom khong hop le.'),
    body('member_ids').isArray({ min: 2 }).withMessage('Can it nhat 2 thanh vien.'),
  ]),
  createGroupConversation
);

router.get('/:id', getConversation);
router.get('/:id/media', listConversationMedia);
router.patch('/:id/permissions', updateGroupPermissions);
router.patch(
  '/:id',
  validate([
    body('name').optional().isLength({ min: 1, max: 120 }).withMessage('Ten nhom khong hop le.'),
    body('avatar').optional().isString(),
  ]),
  updateConversation
);
router.patch(
  '/:id/settings',
  validate([
    body('muted').optional().isBoolean().withMessage('muted phai la boolean.'),
    body('pinned').optional().isBoolean().withMessage('pinned phai la boolean.'),
  ]),
  updateMyConversationSettings
);
router.delete('/:id/members/me', leaveConversation);

router.get('/:conversationId/messages', listMessages);
router.post(
  '/:conversationId/messages',
  validate([
    body('content').optional().isString().isLength({ max: 4000 }).withMessage('Noi dung qua dai.'),
    body('type').optional().isIn(['text', 'image', 'video', 'file', 'sticker', 'voice']),
    body('reply_to_id').optional({ nullable: true }).isInt({ min: 1 }),
    body('attachments').optional().isArray(),
  ]),
  sendMessage
);
router.patch('/:conversationId/seen', markConversationSeen);

module.exports = router;
