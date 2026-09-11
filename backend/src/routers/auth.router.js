const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, changePassword, forgotPassword, logout } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { validateUsername } = require('../utils/username');

const router = express.Router();

router.post(
  '/register',
  validate([
    body('name').notEmpty().withMessage('Tên không được để trống.'),
    body('email').isEmail().withMessage('Email không hợp lệ.'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu tối thiểu 6 ký tự.'),
    body('username').optional({ values: 'null' }).custom((value) => {
      if (typeof value === 'string' && value.trim() === '') return true;
      const result = validateUsername(value);
      if (!result.valid) throw new Error(result.message);
      return true;
    }),
  ]),
  register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email không hợp lệ.'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống.'),
  ]),
  login
);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

router.post(
  '/forgot-password',
  validate([
    body('email').isEmail().withMessage('Email khong hop le.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mat khau moi toi thieu 6 ky tu.'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Xac nhan mat khau khong khop.'),
  ]),
  forgotPassword
);

router.patch(
  '/change-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại không được để trống.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới tối thiểu 6 ký tự.'),
  ]),
  changePassword
);

module.exports = router;
