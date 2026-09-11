const express = require('express');
const { body } = require('express-validator');
const {
  createNote,
  getMyNote,
  getFeed,
  getNote,
  deleteNote,
  getViewers,
  replyToNote,
} = require('../controllers/note.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyNote);
router.get('/feed', getFeed);
router.post(
  '/',
  validate([
    body('text').optional({ nullable: true }).isString().isLength({ max: 60 }).withMessage('Tin ghi chu toi da 60 ky tu.'),
    body('emoji').optional({ nullable: true }).isString().isLength({ max: 16 }).withMessage('Emoji khong hop le.'),
    body('audience').optional().isIn(['ALL_FRIENDS', 'CUSTOM']).withMessage('audience khong hop le.'),
    body('custom_audience_ids').optional({ nullable: true }).isArray().withMessage('Danh sach nguoi xem khong hop le.'),
  ]),
  createNote
);
router.get('/:id', getNote);
router.delete('/:id', deleteNote);
router.get('/:id/viewers', getViewers);
router.post(
  '/:id/reply',
  validate([body('message').notEmpty().isString().isLength({ max: 4000 }).withMessage('Noi dung tra loi khong hop le.')]),
  replyToNote
);

module.exports = router;
