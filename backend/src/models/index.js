const sequelize = require('../config/database');
const User = require('./user.model');
const Product = require('./product.model');

// Associations
User.hasMany(Product, { foreignKey: 'user_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

module.exports = { sequelize, User, Product };
