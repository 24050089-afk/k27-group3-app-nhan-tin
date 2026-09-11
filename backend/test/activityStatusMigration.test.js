const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../migrations/202609100001-add-show-activity-status-to-users');

const Sequelize = { BOOLEAN: 'BOOLEAN' };

test('activity-status migration is idempotent in both directions', async () => {
  const columns = { id: { allowNull: false } };
  const calls = [];
  const queryInterface = {
    describeTable: async () => ({ ...columns }),
    addColumn: async (table, column, definition) => {
      calls.push(['add', table, column, definition]);
      columns[column] = definition;
    },
    removeColumn: async (table, column) => {
      calls.push(['remove', table, column]);
      delete columns[column];
    },
  };

  await migration.up(queryInterface, Sequelize);
  await migration.up(queryInterface, Sequelize);
  assert.equal(calls.filter(([action]) => action === 'add').length, 1);
  assert.deepEqual(columns.show_activity_status, {
    type: 'BOOLEAN',
    allowNull: false,
    defaultValue: true,
    after: 'is_online',
  });

  await migration.down(queryInterface, Sequelize);
  await migration.down(queryInterface, Sequelize);
  assert.equal(calls.filter(([action]) => action === 'remove').length, 1);
});

test('activity-status migration rejects an incompatible pre-existing column', async () => {
  const queryInterface = {
    describeTable: async () => ({
      id: { allowNull: false },
      show_activity_status: { type: 'VARCHAR(255)', allowNull: false, defaultValue: '1' },
    }),
  };

  await assert.rejects(migration.up(queryInterface, Sequelize), /NOT NULL DEFAULT TRUE/);
});
