const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Friendship = sequelize.define(
  'Friendship',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    friend_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'friendships',
    underscored: true,
    indexes: [{ unique: true, fields: ['user_id', 'friend_id'] }],
  }
);

module.exports = Friendship;
