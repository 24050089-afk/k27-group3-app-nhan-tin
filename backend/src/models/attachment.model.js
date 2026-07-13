const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attachment = sequelize.define(
  'Attachment',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    message_id: { type: DataTypes.INTEGER, allowNull: false },
    file_url: { type: DataTypes.STRING, allowNull: false },
    file_type: { type: DataTypes.STRING(80), allowNull: true },
    size: { type: DataTypes.INTEGER, allowNull: true },
    thumbnail_url: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'attachments',
    underscored: true,
  }
);

module.exports = Attachment;
