const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reaction = sequelize.define(
  'Reaction',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    message_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(32), allowNull: false },
  },
  {
    tableName: 'reactions',
    underscored: true,
    indexes: [{ unique: true, fields: ['message_id', 'user_id'] }],
  }
);

module.exports = Reaction;
