const { User } = require('../models');
const {
  updateUserProfile,
  getUsernameAvailability: resolveUsernameAvailability,
} = require('../services/userIdentity.service');

const getAll = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    await updateUserProfile(user, req.body);

    res.json({ success: true, data: user.toSelfJSON(), message: 'Cập nhật thành công.' });
  } catch (error) {
    next(error);
  }
};

const getUsernameAvailability = async (req, res, next) => {
  try {
    const data = await resolveUsernameAvailability(req.query.username, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    await user.destroy();
    res.json({ success: true, message: 'Xóa người dùng thành công.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, getUsernameAvailability, updateProfile, deleteUser };
