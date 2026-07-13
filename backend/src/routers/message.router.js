const express = require('express');
const { body } = require('express-validator');
const {
  editMessage,
  recallMessage,
  reactToMessage,
  removeReaction,
} = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(protect);

router.patch(
  '/:id',
  validate([body('content').notEmpty().isLength({ max: 4000 }).withMessage('Noi dung khong hop le.')]),
  editMessage
);
router.patch('/:id/recall', recallMessage);
router.post(
  '/:id/reactions',
  validate([body('type').notEmpty().isLength({ max: 32 }).withMessage('Bieu cam khong hop le.')]),
  reactToMessage
);
router.delete('/:id/reactions/me', removeReaction);

module.exports = router;
