const express = require('express');
const { body } = require('express-validator');
const {
  getAll,
  getById,
  getUsernameAvailability,
  updateProfile,
  deleteUser,
} = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRateLimit } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(protect);

router.get('/', adminOnly, getAll);
router.get(
  '/username-availability',
  createRateLimit({ windowMs: 60_000, max: 60 }),
  getUsernameAvailability
);
router.get('/:id', getById);

router.patch(
  '/me',
  validate([
    body('name').optional().notEmpty().withMessage('Tên không được để trống.'),
    body('show_activity_status').optional().isBoolean({ strict: true }).withMessage('Trạng thái hoạt động không hợp lệ.'),
  ]),
  updateProfile
);

router.delete('/:id', adminOnly, deleteUser);

module.exports = router;
