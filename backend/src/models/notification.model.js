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
  },
  {
    tableName: 'notifications',
    underscored: true,
  }
);

module.exports = Notification;
