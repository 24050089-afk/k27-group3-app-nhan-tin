'use strict';

const COLUMN = 'show_activity_status';

const hasTrueDefault = (value) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
const hasBooleanType = (value) => /^(BOOLEAN|TINYINT\(1\))$/i.test(String(value || '').trim());

const assertCompatibleColumn = (column) => {
  if (!hasBooleanType(column.type) || column.allowNull !== false || !hasTrueDefault(column.defaultValue)) {
    throw new Error(`${COLUMN} ton tai nhung khong co rang buoc NOT NULL DEFAULT TRUE.`);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (columns[COLUMN]) {
      assertCompatibleColumn(columns[COLUMN]);
      return;
    }

    await queryInterface.addColumn('users', COLUMN, {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'is_online',
    });
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (!columns[COLUMN]) return;
    await queryInterface.removeColumn('users', COLUMN);
  },
};
