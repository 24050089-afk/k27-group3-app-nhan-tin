const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationPreference = sequelize.define(
  'NotificationPreference',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    push_messages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    push_social: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    push_group_updates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    hide_message_preview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dnd_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dnd_start_minutes: { type: DataTypes.INTEGER, allowNull: true },
    dnd_end_minutes: { type: DataTypes.INTEGER, allowNull: true },
    timezone: { type: DataTypes.STRING(80), allowNull: true },
  },
  { tableName: 'notification_preferences', underscored: true }
);

module.exports = NotificationPreference;
