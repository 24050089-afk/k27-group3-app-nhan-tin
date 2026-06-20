const { User } = require('../models');

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
    const { name, avatar } = req.body;
    const user = await User.findByPk(req.user.id);

    await user.update({ name, avatar });

    res.json({ success: true, data: user, message: 'Cập nhật thành công.' });
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

module.exports = { getAll, getById, updateProfile, deleteUser };
