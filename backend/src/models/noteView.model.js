const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NoteView = sequelize.define(
  'NoteView',
  {
    note_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    viewer_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    viewed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'note_views',
    underscored: true,
    timestamps: false,
  }
);

module.exports = NoteView;
