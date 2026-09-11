const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9_]|\.(?!\.)){1,28}[a-z0-9]$/;
const RESERVED_USERNAMES = new Set([
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

const USERNAME_MESSAGES = {
  invalid_type: 'Ten nguoi dung khong hop le.',
  too_short: `Ten nguoi dung phai co it nhat ${USERNAME_MIN_LENGTH} ky tu.`,
  too_long: `Ten nguoi dung khong duoc vuot qua ${USERNAME_MAX_LENGTH} ky tu.`,
  invalid_format: 'Ten nguoi dung chi gom chu thuong, so, dau cham va gach duoi theo dung dinh dang.',
  reserved: 'Ten nguoi dung nay duoc danh rieng va khong the su dung.',
};

const normalizeUsername = (value) => {
  if (typeof value !== 'string') return null;

  let normalized = value.trim();
  if (normalized.startsWith('@')) normalized = normalized.slice(1);
  return normalized.toLowerCase();
};

const validateUsername = (value) => {
  const normalized = normalizeUsername(value);
  if (normalized === null) {
    return { valid: false, code: 'invalid_type', message: USERNAME_MESSAGES.invalid_type, username: null };
  }
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return { valid: false, code: 'too_short', message: USERNAME_MESSAGES.too_short, username: normalized };
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return { valid: false, code: 'too_long', message: USERNAME_MESSAGES.too_long, username: normalized };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return { valid: false, code: 'invalid_format', message: USERNAME_MESSAGES.invalid_format, username: normalized };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { valid: false, code: 'reserved', message: USERNAME_MESSAGES.reserved, username: normalized };
  }

  return { valid: true, code: null, message: null, username: normalized };
};

module.exports = {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
  RESERVED_USERNAMES,
  USERNAME_MESSAGES,
  normalizeUsername,
  validateUsername,
};
