const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define(
  'Conversation',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: {
      type: DataTypes.ENUM('private', 'group'),
      allowNull: false,
      defaultValue: 'private',
    },
    name: { type: DataTypes.STRING(120), allowNull: true },
    avatar: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'conversations',
    underscored: true,
  }
);

module.exports = Conversation;
