const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define(
  'Message',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    conversation_id: { type: DataTypes.INTEGER, allowNull: false },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'file', 'sticker', 'voice'),
      allowNull: false,
      defaultValue: 'text',
    },
    reply_to_id: { type: DataTypes.INTEGER, allowNull: true },
    edited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recalled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'messages',
    underscored: true,
  }
);

module.exports = Message;
