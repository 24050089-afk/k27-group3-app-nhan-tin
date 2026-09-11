const { sequelize } = require('../src/models');

const notificationColumns = [
  ['actor_user_id', 'INT NULL'],
  ['category', 'VARCHAR(32) NULL'],
  ['tier', 'VARCHAR(24) NULL'],
  ['conversation_id', 'INT NULL'],
  ['message_id', 'INT NULL'],
  ['related_type', 'VARCHAR(32) NULL'],
  ['title', 'VARCHAR(120) NULL'],
  ['body', 'VARCHAR(255) NULL'],
  ['data_json', 'JSON NULL'],
  ['event_key', 'VARCHAR(191) NULL'],
  ['collapse_key', 'VARCHAR(191) NULL'],
  ['aggregate_count', 'INT NOT NULL DEFAULT 1'],
  ['read_at', 'DATETIME NULL'],
  ['expires_at', 'DATETIME NULL'],
];

const tableExists = async (table) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table`,
    { replacements: { table } }
  );
  return Number(rows[0]?.count) > 0;
};

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :table AND column_name = :column`,
    { replacements: { table, column } }
  );
  return Number(rows[0]?.count) > 0;
};

const indexExists = async (table, index) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = :table AND index_name = :index`,
    { replacements: { table, index } }
  );
  return Number(rows[0]?.count) > 0;
};

const addIndex = async (table, index, expression) => {
  if (!(await indexExists(table, index))) await sequelize.query(`ALTER TABLE ${table} ADD ${expression}`);
};

const prepare = async () => {
  if (!(await tableExists('notifications'))) throw new Error('Missing notifications table. Start the existing application schema first.');
  for (const [name, definition] of notificationColumns) {
    if (!(await columnExists('notifications', name))) await sequelize.query(`ALTER TABLE notifications ADD COLUMN ${name} ${definition}`);
  }
  await addIndex('notifications', 'notifications_user_read_created_idx', 'INDEX notifications_user_read_created_idx (user_id, `read`, created_at)');
  await addIndex('notifications', 'notifications_user_category_created_idx', 'INDEX notifications_user_category_created_idx (user_id, category, created_at)');
  await addIndex('notifications', 'notifications_user_event_key_unique', 'UNIQUE INDEX notifications_user_event_key_unique (user_id, event_key)');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS push_devices (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      installation_id VARCHAR(191) NOT NULL,
      provider VARCHAR(24) NOT NULL DEFAULT 'expo',
      token_ciphertext TEXT NULL,
      token_hash CHAR(64) NULL,
      platform ENUM('ios','android') NOT NULL,
      project_id VARCHAR(191) NULL,
      permission_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      timezone VARCHAR(80) NULL,
      locale VARCHAR(32) NULL,
      app_version VARCHAR(64) NULL,
      last_seen_at DATETIME NOT NULL,
      last_registered_at DATETIME NULL,
      revoked_at DATETIME NULL,
      last_error_code VARCHAR(80) NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY push_devices_installation_unique (installation_id),
      UNIQUE KEY push_devices_provider_token_unique (provider, token_hash),
      CONSTRAINT push_devices_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      push_messages TINYINT(1) NOT NULL DEFAULT 1,
      push_social TINYINT(1) NOT NULL DEFAULT 1,
      push_group_updates TINYINT(1) NOT NULL DEFAULT 1,
      hide_message_preview TINYINT(1) NOT NULL DEFAULT 0,
      dnd_enabled TINYINT(1) NOT NULL DEFAULT 0,
      dnd_start_minutes INT NULL,
      dnd_end_minutes INT NULL,
      timezone VARCHAR(80) NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY notification_preferences_user_unique (user_id),
      CONSTRAINT notification_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id INT NOT NULL AUTO_INCREMENT,
      notification_id INT NOT NULL,
      user_id INT NOT NULL,
      push_device_id INT NULL,
      idempotency_key VARCHAR(191) NOT NULL,
      payload_json JSON NOT NULL,
      status ENUM('pending','processing','retry','ticketed','receipt_ok','dead','suppressed') NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      available_at DATETIME NOT NULL,
      ticket_id VARCHAR(191) NULL,
      receipt_checked_at DATETIME NULL,
      last_error VARCHAR(500) NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY notification_outbox_idempotency_unique (idempotency_key),
      KEY notification_outbox_due_idx (status, available_at),
      KEY notification_outbox_notification_idx (notification_id),
      CONSTRAINT notification_outbox_notification_fk FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      CONSTRAINT notification_outbox_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT notification_outbox_device_fk FOREIGN KEY (push_device_id) REFERENCES push_devices(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notification_threads (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      collapse_key VARCHAR(191) NOT NULL,
      latest_notification_id INT NULL,
      unread_count INT NOT NULL DEFAULT 0,
      last_event_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY notification_threads_user_collapse_unique (user_id, collapse_key),
      KEY notification_threads_user_unread_idx (user_id, unread_count, last_event_at),
      CONSTRAINT notification_threads_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT notification_threads_notification_fk FOREIGN KEY (latest_notification_id) REFERENCES notifications(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const backfill = async () => {
  await sequelize.query(`
    UPDATE notifications
    SET category = COALESCE(category, CASE WHEN type = 'new_message' THEN 'messages' WHEN type IN ('friend_request','friend_accepted') THEN 'social' ELSE 'system' END),
        tier = COALESCE(tier, CASE WHEN type = 'new_message' THEN 'conversation' WHEN type IN ('friend_request','friend_accepted') THEN 'social' ELSE 'sync_only' END),
        title = COALESCE(title, CASE WHEN type = 'new_message' THEN 'Tin nhan moi' WHEN type = 'friend_request' THEN 'Loi moi ket ban' WHEN type = 'friend_accepted' THEN 'Da ket ban' ELSE 'Thong bao' END),
        body = COALESCE(body, content),
        related_type = COALESCE(related_type, CASE WHEN type = 'new_message' THEN 'message' WHEN type IN ('friend_request','friend_accepted') THEN 'friendship' ELSE 'unknown' END),
        message_id = CASE WHEN type = 'new_message' AND message_id IS NULL THEN related_id ELSE message_id END,
        read_at = CASE WHEN \`read\` = 1 AND read_at IS NULL THEN updated_at ELSE read_at END,
        aggregate_count = COALESCE(aggregate_count, 1)
  `);
};

const finalize = async () => {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM notifications WHERE category IS NULL OR tier IS NULL OR title IS NULL OR body IS NULL OR related_type IS NULL`);
  if (Number(rows[0]?.count) > 0) throw new Error('Backfill incomplete. Run notifications:migrate:backfill before finalize.');
};

const status = async () => {
  const tables = {};
  for (const table of ['notifications', 'push_devices', 'notification_preferences', 'notification_outbox', 'notification_threads']) tables[table] = await tableExists(table);
  const result = { tables, notificationColumns: {}, unread: null };
  if (tables.notifications) {
    for (const [name] of notificationColumns) result.notificationColumns[name] = await columnExists('notifications', name);
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM notifications WHERE \`read\` = 0`);
    result.unread = Number(rows[0]?.count || 0);
  }
  console.log(JSON.stringify(result));
};

const down = async () => {
  if (process.env.ALLOW_NOTIFICATION_MIGRATION_DOWN !== 'true') throw new Error('Set ALLOW_NOTIFICATION_MIGRATION_DOWN=true for this destructive operation.');
  await sequelize.query('DROP TABLE IF EXISTS notification_outbox');
  await sequelize.query('DROP TABLE IF EXISTS notification_threads');
  await sequelize.query('DROP TABLE IF EXISTS notification_preferences');
  await sequelize.query('DROP TABLE IF EXISTS push_devices');
  for (const [name] of [...notificationColumns].reverse()) {
    if (await columnExists('notifications', name)) await sequelize.query(`ALTER TABLE notifications DROP COLUMN ${name}`);
  }
};

const main = async () => {
  const command = process.argv[2] || 'status';
  await sequelize.authenticate();
  if (command === 'prepare') await prepare();
  else if (command === 'backfill') await backfill();
  else if (command === 'finalize') await finalize();
  else if (command === 'down') await down();
  else if (command !== 'status') throw new Error(`Unknown command: ${command}`);
  await status();
  await sequelize.close();
};

main().catch(async (error) => {
  console.error(error.message);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
