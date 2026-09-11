const { sequelize } = require('../src/models');

const TABLE = 'user_nearby_discovery';

const createTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      location_point POINT NOT NULL SRID 4326,
      accuracy_m INT NOT NULL,
      location_updated_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY user_nearby_discovery_user_unique (user_id),
      KEY user_nearby_discovery_expires_idx (expires_at),
      SPATIAL KEY user_nearby_discovery_location_spatial (location_point),
      CONSTRAINT user_nearby_discovery_user_fk FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const status = async () => {
  const [tables] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table`,
    { replacements: { table: TABLE } }
  );
  if (!Number(tables[0]?.count)) {
    console.log(JSON.stringify({ table: false, rowCount: 0 }));
    return;
  }
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
  const [indexes] = await sequelize.query(`SHOW INDEX FROM ${TABLE}`);
  console.log(JSON.stringify({
    table: true,
    rowCount: Number(rows[0]?.count || 0),
    indexes: indexes.map((item) => ({ key: item.Key_name, type: item.Index_type, column: item.Column_name })),
  }));
};

const down = async () => {
  if (process.env.ALLOW_NEARBY_MIGRATION_DOWN !== 'true') {
    throw new Error('Set ALLOW_NEARBY_MIGRATION_DOWN=true for the destructive down operation.');
  }
  await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
};

const main = async () => {
  const command = process.argv[2] || 'status';
  await sequelize.authenticate();
  if (command === 'up') await createTable();
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
