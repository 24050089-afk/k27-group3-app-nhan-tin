require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, NotificationOutbox, PushDevice } = require('../src/models');
const { decryptPushToken } = require('../src/services/pushTokenCrypto.service');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;
const delayForAttempt = (attempt) => Math.min(60 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, attempt - 1)));

const markRetry = async (entry, message) => {
  const attempts = entry.attempts + 1;
  await entry.update({
    status: attempts >= MAX_ATTEMPTS ? 'dead' : 'retry',
    attempts,
    available_at: new Date(Date.now() + delayForAttempt(attempts)),
    last_error: String(message || 'Push delivery failed').slice(0, 500),
  });
};

const sendBatch = async (entries) => {
  if (process.env.PUSH_ENABLED !== 'true') return;
  const deviceIds = entries.map((entry) => entry.push_device_id).filter(Boolean);
  const devices = await PushDevice.findAll({ where: { id: deviceIds } });
  const tokenByDevice = new Map(devices.map((device) => [Number(device.id), decryptPushToken(device.token_ciphertext)]));
  const validEntries = entries.filter((entry) => tokenByDevice.get(Number(entry.push_device_id)));
  await Promise.all(entries.filter((entry) => !tokenByDevice.get(Number(entry.push_device_id))).map((entry) => entry.update({ status: 'dead', last_error: 'Push token unavailable' })));
  if (!validEntries.length) return;
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
    body: JSON.stringify(validEntries.map((entry) => ({ ...entry.payload_json, to: tokenByDevice.get(Number(entry.push_device_id)) }))),
  });
  if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
  const json = await response.json();
  const tickets = Array.isArray(json.data) ? json.data : [];
  await Promise.all(validEntries.map(async (entry, index) => {
    const ticket = tickets[index];
    if (ticket?.status === 'ok') {
      await entry.update({ status: 'ticketed', ticket_id: ticket.id || null, attempts: entry.attempts + 1, last_error: null });
      return;
    }
    const code = ticket?.details?.error || ticket?.message || 'Expo rejected push ticket';
    if (code === 'DeviceNotRegistered' && entry.push_device_id) await PushDevice.update({ revoked_at: new Date(), token_ciphertext: null, token_hash: null, enabled: false, last_error_code: code }, { where: { id: entry.push_device_id } });
    await markRetry(entry, code);
  }));
};

const checkReceipts = async () => {
  const entries = await NotificationOutbox.findAll({
    where: { status: 'ticketed', ticket_id: { [Op.ne]: null }, updated_at: { [Op.lte]: new Date(Date.now() - 15 * 60 * 1000) } },
    order: [['id', 'ASC']],
    limit: BATCH_SIZE,
  });
  if (!entries.length || process.env.PUSH_ENABLED !== 'true') return 0;
  const response = await fetch(EXPO_RECEIPT_URL, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: entries.map((entry) => entry.ticket_id) }),
  });
  if (!response.ok) throw new Error(`Expo receipt HTTP ${response.status}`);
  const result = await response.json();
  for (const entry of entries) {
    const receipt = result.data?.[entry.ticket_id];
    if (receipt?.status === 'ok') await entry.update({ status: 'receipt_ok', receipt_checked_at: new Date(), last_error: null });
    else if (receipt?.status === 'error') {
      const code = receipt.details?.error || receipt.message || 'Expo receipt error';
      if (code === 'DeviceNotRegistered' && entry.push_device_id) await PushDevice.update({ revoked_at: new Date(), token_ciphertext: null, token_hash: null, enabled: false, last_error_code: code }, { where: { id: entry.push_device_id } });
      await entry.update({ status: code === 'DeviceNotRegistered' ? 'dead' : 'retry', receipt_checked_at: new Date(), last_error: String(code).slice(0, 500), available_at: new Date(Date.now() + delayForAttempt(entry.attempts || 1)) });
    }
  }
  return entries.length;
};

const run = async () => {
  await sequelize.authenticate();
  const entries = await NotificationOutbox.findAll({
    where: { status: { [Op.in]: ['pending', 'retry'] }, available_at: { [Op.lte]: new Date() } },
    order: [['id', 'ASC']],
    limit: BATCH_SIZE,
  });
  const receiptCount = await checkReceipts().catch((error) => { console.error(`notification receipt check failed: ${error.message}`); return 0; });
  if (!entries.length) return receiptCount;
  if (process.env.PUSH_ENABLED !== 'true') {
    await Promise.all(entries.map((entry) => entry.update({ status: 'suppressed', last_error: 'PUSH_ENABLED is not true' })));
    return entries.length + receiptCount;
  }
  await Promise.all(entries.map((entry) => entry.update({ status: 'processing' })));
  try {
    await sendBatch(entries);
  } catch (error) {
    await Promise.all(entries.map((entry) => markRetry(entry, error.message)));
  }
  return entries.length + receiptCount;
};

run()
  .then((count) => console.log(`notification-worker processed ${count} outbox entries`))
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
