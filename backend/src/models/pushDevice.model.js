const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushDevice = sequelize.define(
  'PushDevice',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    installation_id: { type: DataTypes.STRING(191), allowNull: false },
    provider: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'expo' },
    token_ciphertext: { type: DataTypes.TEXT, allowNull: true },
    token_hash: { type: DataTypes.STRING(64), allowNull: true },
    platform: { type: DataTypes.ENUM('ios', 'android'), allowNull: false },
    project_id: { type: DataTypes.STRING(191), allowNull: true },
    permission_status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'unknown' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    timezone: { type: DataTypes.STRING(80), allowNull: true },
    locale: { type: DataTypes.STRING(32), allowNull: true },
    app_version: { type: DataTypes.STRING(64), allowNull: true },
    last_seen_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_registered_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    last_error_code: { type: DataTypes.STRING(80), allowNull: true },
  },
  { tableName: 'push_devices', underscored: true }
);

module.exports = PushDevice;
