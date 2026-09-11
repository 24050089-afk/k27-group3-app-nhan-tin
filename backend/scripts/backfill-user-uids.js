require('dotenv').config();
const { QueryTypes } = require('sequelize');
const sequelize = require('../src/config/database');
const {
  generatePublicUid,
} = require('../src/utils/publicUid');

const LOCK_NAME = 'proxy_backfill_user_uids_v1';
const DEFAULT_BATCH_SIZE = 100;
const MAX_UID_ATTEMPTS = 8;

const parseBatchSize = (value) => {
  const parsed = Number(value || DEFAULT_BATCH_SIZE);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error('UID_BACKFILL_BATCH_SIZE phai la so nguyen tu 1 den 1000.');
  }
  return parsed;
};

const backfillUserUids = async ({ batchSize = parseBatchSize(process.env.UID_BACKFILL_BATCH_SIZE) } = {}) => {
  let lockAcquired = false;
  let totalUpdated = 0;
  sequelize.options.logging = false;

  try {
    await sequelize.authenticate();
    const columns = await sequelize.getQueryInterface().describeTable('users');
    if (!columns.uid) {
      throw new Error('Cot users.uid chua ton tai. Hay chay migration nullable truoc.');
    }

    const [lockResult] = await sequelize.query(
      'SELECT GET_LOCK(:lockName, 10) AS acquired',
      { replacements: { lockName: LOCK_NAME }, type: QueryTypes.SELECT }
    );
    lockAcquired = Number(lockResult?.acquired) === 1;
    if (!lockAcquired) throw new Error('Khong lay duoc khoa backfill UID.');

    while (true) {
      const rows = await sequelize.query(
        'SELECT id FROM users WHERE uid IS NULL ORDER BY id ASC LIMIT :batchSize',
        { replacements: { batchSize }, type: QueryTypes.SELECT }
      );
      if (rows.length === 0) break;

      const batchUpdated = await sequelize.transaction(async (transaction) => {
        let updatedCount = 0;
        for (const row of rows) {
          let assigned = false;
          for (let attempt = 0; attempt < MAX_UID_ATTEMPTS; attempt += 1) {
            const uid = generatePublicUid();
            const existing = await sequelize.query(
              'SELECT id FROM users WHERE uid = :uid LIMIT 1',
              { replacements: { uid }, type: QueryTypes.SELECT, transaction }
            );
            if (existing.length > 0) continue;

            try {
              const [, metadata] = await sequelize.query(
                'UPDATE users SET uid = :uid, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND uid IS NULL',
                { replacements: { uid, id: row.id }, transaction }
              );
              assigned = true;
              if (Number(metadata?.affectedRows || 0) > 0) updatedCount += 1;
              break;
            } catch (error) {
              if (error?.original?.code === 'ER_DUP_ENTRY') continue;
              throw error;
            }
          }
          if (!assigned) throw new Error('Khong the sinh UID duy nhat sau so lan thu cho phep.');
        }
        return updatedCount;
      });
      totalUpdated += batchUpdated;

      console.log(`Da backfill ${totalUpdated} tai khoan.`);
    }

    const [verification] = await sequelize.query(`
      SELECT
        COUNT(*) AS total_count,
        SUM(uid IS NULL) AS null_count,
        COUNT(DISTINCT uid) AS unique_count,
        SUM(uid IS NOT NULL AND uid NOT REGEXP '^LT-[0-9A-HJKMNP-TV-Z]{12}$') AS invalid_count
      FROM users
    `, { type: QueryTypes.SELECT });

    if (
      Number(verification.null_count || 0) !== 0
      || Number(verification.total_count || 0) !== Number(verification.unique_count || 0)
      || Number(verification.invalid_count || 0) !== 0
    ) {
      throw new Error('Xac minh UID sau backfill khong dat. Khong duoc chay migration not-null.');
    }

    console.log(`Backfill hoan tat. Tong tai khoan: ${verification.total_count}.`);
    return { totalUpdated, totalUsers: Number(verification.total_count || 0) };
  } finally {
    if (lockAcquired) {
      await sequelize.query('SELECT RELEASE_LOCK(:lockName)', {
        replacements: { lockName: LOCK_NAME },
        type: QueryTypes.SELECT,
      }).catch(() => {});
    }
  }
};

if (require.main === module) {
  backfillUserUids()
    .catch((error) => {
      console.error(`Backfill UID that bai: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { backfillUserUids, parseBatchSize };
