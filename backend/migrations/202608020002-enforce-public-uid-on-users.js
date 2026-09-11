'use strict';

const UNIQUE_INDEX_NAME = 'users_uid_unique';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [summary] = await queryInterface.sequelize.query(`
      SELECT
        SUM(uid IS NULL) AS null_count,
        SUM(uid IS NOT NULL AND uid NOT REGEXP '^LT-[0-9A-HJKMNP-TV-Z]{12}$') AS invalid_count
      FROM users
    `, { type: Sequelize.QueryTypes.SELECT });
    const [duplicate] = await queryInterface.sequelize.query(`
      SELECT uid
      FROM users
      WHERE uid IS NOT NULL
      GROUP BY uid
      HAVING COUNT(*) > 1
      LIMIT 1
    `, { type: Sequelize.QueryTypes.SELECT });

    if (Number(summary?.null_count || 0) > 0) {
      throw new Error('Khong the khoa schema: users van con UID null.');
    }
    if (Number(summary?.invalid_count || 0) > 0) {
      throw new Error('Khong the khoa schema: users co UID sai dinh dang.');
    }
    if (duplicate) {
      throw new Error('Khong the khoa schema: users co UID trung lap.');
    }

    const indexes = await queryInterface.showIndex('users');
    if (!indexes.some((index) => index.name === UNIQUE_INDEX_NAME)) {
      await queryInterface.addIndex('users', ['uid'], {
        name: UNIQUE_INDEX_NAME,
        unique: true,
      });
    }
    await queryInterface.changeColumn('users', 'uid', {
      type: Sequelize.STRING(15),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'uid', {
      type: Sequelize.STRING(15),
      allowNull: true,
    });
    const indexes = await queryInterface.showIndex('users');
    if (indexes.some((index) => index.name === UNIQUE_INDEX_NAME)) {
      await queryInterface.removeIndex('users', UNIQUE_INDEX_NAME);
    }
  },
};
