'use strict';

const UNIQUE_INDEX_NAME = 'users_uid_unique';
const LEGACY_UNIQUE_COLUMNS = ['email', 'phone', 'username'];

const getIndexFieldNames = (index) => (index.fields || [])
  .map((field) => field.attribute || field.name)
  .filter(Boolean);

const findRedundantLegacyUniqueIndexes = (indexes) => {
  const redundant = [];

  for (const column of LEGACY_UNIQUE_COLUMNS) {
    const equivalent = indexes.filter((index) => {
      const fields = getIndexFieldNames(index);
      return index.unique && fields.length === 1 && fields[0] === column;
    });
    if (equivalent.length < 2) continue;

    const keeper = equivalent.find((index) => index.name === column)
      || [...equivalent].sort((left, right) => left.name.localeCompare(right.name))[0];
    redundant.push(...equivalent
      .filter((index) => index.name !== keeper.name)
      .map((index) => index.name));
  }

  return redundant.sort((left, right) => left.localeCompare(right));
};

const isTooManyKeysError = (error) => (
  error?.original?.code === 'ER_TOO_MANY_KEYS'
  || error?.parent?.code === 'ER_TOO_MANY_KEYS'
);

const addUidUniqueIndex = async (queryInterface) => {
  try {
    await queryInterface.addIndex('users', ['uid'], {
      name: UNIQUE_INDEX_NAME,
      unique: true,
    });
  } catch (error) {
    if (!isTooManyKeysError(error)) throw error;

    const indexes = await queryInterface.showIndex('users');
    const redundantIndexes = findRedundantLegacyUniqueIndexes(indexes);
    if (redundantIndexes.length === 0) throw error;

    for (const indexName of redundantIndexes) {
      await queryInterface.removeIndex('users', indexName);
    }

    await queryInterface.addIndex('users', ['uid'], {
      name: UNIQUE_INDEX_NAME,
      unique: true,
    });
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.uid) {
      await queryInterface.addColumn('users', 'uid', {
        type: Sequelize.STRING(15),
        allowNull: true,
        after: 'id',
      });
    }
    const indexes = await queryInterface.showIndex('users');
    if (!indexes.some((index) => index.name === UNIQUE_INDEX_NAME)) {
      await addUidUniqueIndex(queryInterface);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.uid) return;

    const indexes = await queryInterface.showIndex('users');
    if (indexes.some((index) => index.name === UNIQUE_INDEX_NAME)) {
      await queryInterface.removeIndex('users', UNIQUE_INDEX_NAME);
    }
    await queryInterface.removeColumn('users', 'uid');
  },
};

module.exports.findRedundantLegacyUniqueIndexes = findRedundantLegacyUniqueIndexes;
module.exports.isTooManyKeysError = isTooManyKeysError;
