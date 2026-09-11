const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(60), allowNull: false },
    content: { type: DataTypes.STRING(255), allowNull: false },
    related_id: { type: DataTypes.INTEGER, allowNull: true },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    actor_user_id: { type: DataTypes.INTEGER, allowNull: true },
    category: { type: DataTypes.STRING(32), allowNull: true },
    tier: { type: DataTypes.STRING(24), allowNull: true },
    conversation_id: { type: DataTypes.INTEGER, allowNull: true },
    message_id: { type: DataTypes.INTEGER, allowNull: true },
    related_type: { type: DataTypes.STRING(32), allowNull: true },
    title: { type: DataTypes.STRING(120), allowNull: true },
    body: { type: DataTypes.STRING(255), allowNull: true },
    data_json: { type: DataTypes.JSON, allowNull: true },
    event_key: { type: DataTypes.STRING(191), allowNull: true },
    collapse_key: { type: DataTypes.STRING(191), allowNull: true },
    aggregate_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    read_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'notifications',
    underscored: true,
  }
);

module.exports = Notification;
