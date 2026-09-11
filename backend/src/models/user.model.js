const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { PUBLIC_UID_REGEX } = require('../utils/publicUid');
const { normalizeUsername } = require('../utils/username');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
    uid: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: 'users_uid_unique',
      validate: {
        isCanonicalPublicUid(value) {
          if (!PUBLIC_UID_REGEX.test(value)) throw new Error('UID khong dung dinh dang canonical.');
        },
      },
    },
    username: {
      type: DataTypes.STRING(60),
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    bio: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    show_activity_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'users',
    underscored: true,
    hooks: {
      beforeValidate: (user) => {
        if (user.changed('username') && user.username !== null && user.username !== undefined) {
          user.username = normalizeUsername(user.username);
        }
      },
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed('uid')) {
          throw new Error('UID tai khoan la bat bien va khong the cap nhat.');
        }
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeBulkUpdate: (options) => {
        if (Object.prototype.hasOwnProperty.call(options.attributes || {}, 'uid')) {
          throw new Error('UID tai khoan la bat bien va khong the cap nhat.');
        }
      },
    },
  }
);

User.prototype.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.show_activity_status;
  return values;
};

User.prototype.toSelfJSON = function () {
  return {
    ...this.toJSON(),
    show_activity_status: this.getDataValue('show_activity_status') !== false,
  };
};

module.exports = User;
