const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageStatus = sequelize.define(
  'MessageStatus',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    message_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'seen'),
      allowNull: false,
      defaultValue: 'sent',
    },
    seen_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'message_statuses',
    underscored: true,
    indexes: [{ unique: true, fields: ['message_id', 'user_id'] }],
  }
);

module.exports = MessageStatus;
