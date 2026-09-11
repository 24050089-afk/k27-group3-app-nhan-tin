const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserNearbyDiscovery = sequelize.define(
  'UserNearbyDiscovery',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    // Stored point is quantized by the service before persistence. It is never serialized.
    location_point: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: false },
    accuracy_m: { type: DataTypes.INTEGER, allowNull: false },
    location_updated_at: { type: DataTypes.DATE, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'user_nearby_discovery',
    underscored: true,
    indexes: [
      { name: 'user_nearby_discovery_user_unique', unique: true, fields: ['user_id'] },
      { name: 'user_nearby_discovery_expires_idx', fields: ['expires_at'] },
    ],
  }
);

module.exports = UserNearbyDiscovery;
