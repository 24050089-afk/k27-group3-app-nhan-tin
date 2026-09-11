const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Note = sequelize.define(
  'Note',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    author_id: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.STRING(60), allowNull: true },
    emoji: { type: DataTypes.STRING(16), allowNull: true },
    audience: {
      type: DataTypes.ENUM('ALL_FRIENDS', 'CUSTOM'),
      allowNull: false,
      defaultValue: 'ALL_FRIENDS',
    },
    custom_audience_ids: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'DELETED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'notes',
    underscored: true,
    indexes: [
      { fields: ['author_id', 'status'] },
      { fields: ['expires_at', 'status'] },
    ],
  }
);

module.exports = Note;
