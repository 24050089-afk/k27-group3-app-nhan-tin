if (require.main === module) require('dotenv').config();
const sequelize = require('../src/config/database');
const { ALL_PERMISSION_KEYS } = require('../src/utils/groupPermissions');
const ROLE_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter((key) => !key.startsWith('members_can_'));
const TABLE = 'conversation_permissions';

async function prepare() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    conversation_id INT NOT NULL PRIMARY KEY,
    ${ALL_PERMISSION_KEYS.map((key) => `${key} BOOLEAN NOT NULL DEFAULT TRUE`).join(',\n')},
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT conversation_permissions_conversation_fk FOREIGN KEY (conversation_id)
      REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT conversation_permissions_version_check CHECK (version >= 1)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${TABLE}`);
  // Existing tables may be missing legacy member columns. Do not silently
  // default those columns open; finalize must remain blocked until repaired
  // from a verified schema/backup. Only additive owner/admin columns are safe
  // to introduce with their declared TRUE defaults.
  for (const key of ROLE_PERMISSION_KEYS) {
    if (!columns.some((column) => column.Field === key)) await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN ${key} BOOLEAN NOT NULL DEFAULT TRUE`);
  }
}

async function status() {
  const [tables] = await sequelize.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table', { replacements: { table: TABLE } });
  if (!tables.length) return { table: false, ready: false };
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${TABLE}`);
  const missingColumns = ['conversation_id', ...ALL_PERMISSION_KEYS, 'version', 'created_at', 'updated_at'].filter((key) => !columns.some((column) => column.Field === key));
  if (missingColumns.length) return { table: true, missingColumns, ready: false };
  const [rows] = await sequelize.query(`SELECT
    (SELECT COUNT(*) FROM conversations c LEFT JOIN ${TABLE} p ON p.conversation_id = c.id WHERE c.type = 'group' AND p.conversation_id IS NULL) AS missing,
    (SELECT COUNT(*) FROM ${TABLE} p LEFT JOIN conversations c ON c.id = p.conversation_id WHERE c.id IS NULL OR c.type <> 'group') AS invalid_conversations,
    (SELECT COUNT(*) FROM conversations c LEFT JOIN conversation_members m ON m.conversation_id = c.id AND m.user_id = c.created_by WHERE c.type = 'group' AND (m.id IS NULL OR m.role <> 'admin')) AS invalid_owners,
    (SELECT COUNT(*) FROM ${TABLE} WHERE version IS NULL OR version < 1 OR ${ALL_PERMISSION_KEYS.map((key) => `${key} IS NULL OR ${key} NOT IN (0, 1)`).join(' OR ')}) AS invalid_policy`);
  const [keys] = await sequelize.query(`SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = 'conversation_id'`, { replacements: { table: TABLE } });
  const primary = keys.some((key) => key.CONSTRAINT_NAME === 'PRIMARY');
  const foreignKey = keys.some((key) => key.REFERENCED_TABLE_NAME === 'conversations' && key.REFERENCED_COLUMN_NAME === 'id');
  const nonNullable = columns.filter((column) => ALL_PERMISSION_KEYS.includes(column.Field) || column.Field === 'version').every((column) => column.Null === 'NO');
  const counts = Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
  return { table: true, primary, foreignKey, nonNullable, ...counts, ready: primary && foreignKey && nonNullable && Object.values(counts).every((value) => value === 0) };
}

async function backfill() {
  if (process.env.GROUP_PERMISSIONS_MANAGEMENT_ENABLED === 'true' || !process.argv.includes('--before-activation')) {
    throw new Error('Backfill is only allowed before activation, with management disabled and --before-activation. Stop old group writers before final backfill.');
  }
  const [restricted] = await sequelize.query(`SELECT COUNT(*) AS total FROM ${TABLE} WHERE ${ALL_PERMISSION_KEYS.map((key) => `${key} = FALSE`).join(' OR ')}`);
  if (Number(restricted[0].total)) throw new Error('Restrictive policies exist. Restore missing policies from verified backup instead of defaulting to allow.');
  await sequelize.query(`INSERT INTO ${TABLE} (conversation_id, created_at, updated_at)
    SELECT c.id, NOW(), NOW() FROM conversations c LEFT JOIN ${TABLE} p ON p.conversation_id = c.id
    WHERE c.type = 'group' AND p.conversation_id IS NULL`);
}

async function main() {
  const command = process.argv[2] || 'status';
  if (!['status', 'prepare', 'backfill', 'finalize', 'down'].includes(command)) throw new Error('Unknown migration command.');
  await sequelize.authenticate();
  if (command === 'prepare') await prepare();
  if (command === 'backfill') await backfill();
  if (command === 'down') {
    if (!String(process.env.DB_NAME).endsWith('_test') || process.env.NODE_ENV !== 'test' || !process.argv.includes('--confirm-drop')) {
      throw new Error('Down requires an isolated *_test database, NODE_ENV=test and --confirm-drop.');
    }
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
  }
  const result = await status();
  console.log(JSON.stringify(result));
  if (command === 'finalize' && !result.ready) throw new Error('Group permission invariants failed. Do not enable management.');
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}
module.exports = { prepare, status, backfill };
