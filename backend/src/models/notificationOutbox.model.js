const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationOutbox = sequelize.define(
  'NotificationOutbox',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    notification_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    push_device_id: { type: DataTypes.INTEGER, allowNull: true },
    idempotency_key: { type: DataTypes.STRING(191), allowNull: false },
    payload_json: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'processing', 'retry', 'ticketed', 'receipt_ok', 'dead', 'suppressed'), allowNull: false, defaultValue: 'pending' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    available_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ticket_id: { type: DataTypes.STRING(191), allowNull: true },
    receipt_checked_at: { type: DataTypes.DATE, allowNull: true },
    last_error: { type: DataTypes.STRING(500), allowNull: true },
  },
  { tableName: 'notification_outbox', underscored: true }
);

module.exports = NotificationOutbox;
