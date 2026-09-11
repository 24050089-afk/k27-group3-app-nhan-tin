require('dotenv').config();
const Sequelize = require('sequelize');
const sequelize = require('../src/config/database');
const migration = require('../migrations/202609100001-add-show-activity-status-to-users');

const hasTrueDefault = (value) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
const hasBooleanType = (value) => /^(BOOLEAN|TINYINT\(1\))$/i.test(String(value || '').trim());

const getStatus = async () => {
  const columns = await sequelize.getQueryInterface().describeTable('users');
  const column = columns.show_activity_status;
  return {
    ready: Boolean(column && hasBooleanType(column.type) && column.allowNull === false && hasTrueDefault(column.defaultValue)),
    column: Boolean(column),
    allowNull: column?.allowNull ?? null,
    defaultValue: column?.defaultValue ?? null,
    type: column?.type ?? null,
  };
};

const run = async (command) => {
  sequelize.options.logging = false;
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  if (command === 'status') {
    console.log(JSON.stringify(await getStatus(), null, 2));
    return;
  }
  if (command === 'up') {
    await migration.up(queryInterface, Sequelize);
    console.log(JSON.stringify(await getStatus(), null, 2));
    return;
  }
  if (command === 'down') {
    await migration.down(queryInterface, Sequelize);
    console.log(JSON.stringify(await getStatus(), null, 2));
    return;
  }

  console.error('Cach dung: node scripts/migrate-activity-status.js <status|up|down>');
  process.exitCode = 1;
};

if (require.main === module) {
  run(process.argv[2])
    .catch((error) => {
      console.error(`Migration activity status that bai: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { getStatus, run };
