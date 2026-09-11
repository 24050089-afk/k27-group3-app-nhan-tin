export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_]|\.(?!\.)){1,28}[a-z0-9]$/;
export const RESERVED_USERNAMES = Object.freeze([
  'admin',
  'administrator',
  'support',
  'system',
  'root',
  'api',
  'official',
  'moderator',
  'null',
  'undefined',
  'proxy',
]);

export function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@/, '').toLowerCase();
}

export function validateUsername(value, { allowEmpty = true } = {}) {
  const username = normalizeUsername(value);
  if (!username) {
    return allowEmpty
      ? { valid: true, username, error: null }
      : { valid: false, username, error: 'Hãy nhập tên người dùng.' };
  }
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      username,
      error: `Tên người dùng cần từ ${USERNAME_MIN_LENGTH} đến ${USERNAME_MAX_LENGTH} ký tự.`,
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      username,
      error: 'Dùng chữ thường, số, dấu chấm hoặc gạch dưới; không đặt dấu ở cuối.',
    };
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return { valid: false, username, error: 'Tên người dùng này được dành riêng.' };
  }
  return { valid: true, username, error: null };
}
