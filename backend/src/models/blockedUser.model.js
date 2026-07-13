const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockedUser = sequelize.define(
  'BlockedUser',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    blocked_user_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'blocked_users',
    underscored: true,
    indexes: [{ unique: true, fields: ['user_id', 'blocked_user_id'] }],
  }
);

module.exports = BlockedUser;
