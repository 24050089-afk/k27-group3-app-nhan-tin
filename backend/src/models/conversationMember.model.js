const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationMember = sequelize.define(
  'ConversationMember',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    conversation_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      allowNull: false,
      defaultValue: 'member',
    },
    last_read_message_id: { type: DataTypes.INTEGER, allowNull: true },
    muted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'conversation_members',
    underscored: true,
    indexes: [{ unique: true, fields: ['conversation_id', 'user_id'] }],
  }
);

module.exports = ConversationMember;
