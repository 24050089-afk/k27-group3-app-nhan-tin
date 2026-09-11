require('dotenv').config();
const Sequelize = require('sequelize');
const sequelize = require('../src/config/database');
const prepareMigration = require('../migrations/202608020001-add-public-uid-to-users');
const finalizeMigration = require('../migrations/202608020002-enforce-public-uid-on-users');

const printUsage = () => {
  console.log([
    'Cach dung:',
    '  node scripts/migrate-user-identities.js status',
    '  node scripts/migrate-user-identities.js prepare',
    '  node scripts/backfill-user-uids.js',
    '  node scripts/migrate-user-identities.js finalize',
    '',
    'Thu tu bat buoc trong maintenance window: backup -> tam dung ghi users -> prepare -> backfill -> finalize -> deploy/restart backend.',
  ].join('\n'));
};

const getStatus = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('users');
  if (!columns.uid) return { column: false, unique: false, allowNull: null, nullCount: null };

  const indexes = await queryInterface.showIndex('users');
  const [[counts]] = await sequelize.query(
    'SELECT COUNT(*) AS total_count, SUM(uid IS NULL) AS null_count FROM users'
  );
  return {
    column: true,
    unique: indexes.some((index) => index.name === 'users_uid_unique' && index.unique),
    allowNull: columns.uid.allowNull,
    nullCount: Number(counts?.null_count || 0),
    totalCount: Number(counts?.total_count || 0),
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
  if (command === 'prepare') {
    await prepareMigration.up(queryInterface, Sequelize);
    console.log('Da them users.uid nullable va unique index. Giu tam dung ghi users va chay backfill ngay.');
    return;
  }
  if (command === 'finalize') {
    await finalizeMigration.up(queryInterface, Sequelize);
    console.log('Da xac minh va khoa users.uid NOT NULL UNIQUE.');
    return;
  }

  printUsage();
  if (command) process.exitCode = 1;
};

if (require.main === module) {
  run(process.argv[2])
    .catch((error) => {
      console.error(`Migration UID that bai: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { getStatus, run };
