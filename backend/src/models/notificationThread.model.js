const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationThread = sequelize.define(
  'NotificationThread',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    collapse_key: { type: DataTypes.STRING(191), allowNull: false },
    latest_notification_id: { type: DataTypes.INTEGER, allowNull: true },
    unread_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_event_at: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'notification_threads', underscored: true }
);

module.exports = NotificationThread;
