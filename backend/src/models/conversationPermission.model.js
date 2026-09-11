const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PERMISSION_KEYS } = require('../utils/groupPermissions');

module.exports = sequelize.define('ConversationPermission', {
  conversation_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  ...Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }])),
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
}, { tableName: 'conversation_permissions', underscored: true });
