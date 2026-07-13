const jwt = require('jsonwebtoken');
const { User } = require('../models');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, username } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng.' });
    }

    const user = await User.create({ name, email, password, phone, username, is_online: true });
    const token = signToken(user.id);

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const rawUser = await User.findOne({
      where: { email },
      attributes: { include: ['password'] },
    });

    if (!rawUser || !(await rawUser.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
    }

    await rawUser.update({ is_online: true, last_seen_at: new Date() });
    const token = signToken(rawUser.id);
    const userJSON = rawUser.toJSON();

    res.json({ success: true, data: { user: userJSON, token } });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const rawUser = await User.findOne({
      where: { id: req.user.id },
      attributes: { include: ['password'] },
    });

    if (!(await rawUser.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
    }

    await rawUser.update({ password: newPassword });

    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan voi email nay.' });
    }

    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Da dat lai mat khau. Ban co the dang nhap bang mat khau moi.',
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await req.user.update({ is_online: false, last_seen_at: new Date() });
    res.json({ success: true, message: 'Da dang xuat.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword, forgotPassword, logout };
