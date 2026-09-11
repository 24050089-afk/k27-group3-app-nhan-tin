const crypto = require('crypto');

const PUBLIC_UID_PREFIX = 'LT-';
const PUBLIC_UID_BODY_LENGTH = 12;
const PUBLIC_UID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PUBLIC_UID_REGEX = /^LT-[0-9A-HJKMNP-TV-Z]{12}$/;
const PUBLIC_UID_MAX_INPUT_LENGTH = PUBLIC_UID_PREFIX.length + PUBLIC_UID_BODY_LENGTH;

const generatePublicUid = (randomBytes = crypto.randomBytes) => {
  const bytes = randomBytes(PUBLIC_UID_BODY_LENGTH);
  if (!bytes || bytes.length < PUBLIC_UID_BODY_LENGTH) {
    throw new Error('Nguon ngau nhien khong tao du du lieu cho UID.');
  }

  let body = '';
  for (let index = 0; index < PUBLIC_UID_BODY_LENGTH; index += 1) {
    body += PUBLIC_UID_ALPHABET[bytes[index] & 31];
  }
  return `${PUBLIC_UID_PREFIX}${body}`;
};

const normalizePublicUid = (value) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PUBLIC_UID_MAX_INPUT_LENGTH) return null;

  const normalized = trimmed.toUpperCase();
  return PUBLIC_UID_REGEX.test(normalized) ? normalized : null;
};

const isValidPublicUid = (value) => normalizePublicUid(value) !== null;

module.exports = {
  PUBLIC_UID_PREFIX,
  PUBLIC_UID_BODY_LENGTH,
  PUBLIC_UID_ALPHABET,
  PUBLIC_UID_REGEX,
  PUBLIC_UID_MAX_INPUT_LENGTH,
  generatePublicUid,
  normalizePublicUid,
  isValidPublicUid,
};
