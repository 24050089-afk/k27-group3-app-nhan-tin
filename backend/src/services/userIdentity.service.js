const { Op } = require('sequelize');
const { sequelize, User } = require('../models');
const { generatePublicUid } = require('../utils/publicUid');
const { normalizeUsername, validateUsername } = require('../utils/username');

const UID_GENERATION_ATTEMPTS = 8;
const PROFILE_FIELDS = ['name', 'avatar', 'phone', 'username', 'bio', 'show_activity_status'];

class UserIdentityError extends Error {
  constructor(message, code, status = 400, field = null) {
    super(message);
    this.name = 'UserIdentityError';
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const getUniqueConflictField = (error) => {
  if (!error || (error.name !== 'SequelizeUniqueConstraintError' && !error.fields)) return null;

  const candidates = [
    ...Object.keys(error.fields || {}),
    ...(Array.isArray(error.errors) ? error.errors.map((item) => item?.path) : []),
    error.parent?.sqlMessage,
    error.message,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  for (const field of ['uid', 'username', 'email', 'phone']) {
    if (candidates.some((candidate) => candidate === field || candidate.includes(field))) return field;
  }
  return null;
};

const conflictForField = (field) => {
  const messages = {
    uid: 'Khong the cap UID duy nhat cho tai khoan.',
    username: 'Ten nguoi dung da duoc su dung.',
    email: 'Email da duoc su dung.',
    phone: 'So dien thoai da duoc su dung.',
  };
  return new UserIdentityError(
    messages[field] || 'Thong tin tai khoan da ton tai.',
    `${String(field || 'identity').toUpperCase()}_TAKEN`,
    field === 'uid' ? 500 : 409,
    field
  );
};

const normalizeOptionalUsername = (value, { emptyAsNull = true } = {}) => {
  if (value === null || value === undefined) return null;
  if (emptyAsNull && typeof value === 'string' && value.trim() === '') return null;

  const result = validateUsername(value);
  if (!result.valid) {
    throw new UserIdentityError(result.message, `USERNAME_${result.code.toUpperCase()}`, 422, 'username');
  }
  return result.username;
};

const createUserWithIdentity = async (data, options = {}) => {
  const UserModel = options.UserModel || User;
  const sequelizeInstance = options.sequelizeInstance || sequelize;
  const uidGenerator = options.uidGenerator || generatePublicUid;
  const maxAttempts = options.maxAttempts || UID_GENERATION_ATTEMPTS;
  const username = normalizeOptionalUsername(data.username);
  const safeData = {
    name: data.name,
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email,
    password: data.password,
    phone: data.phone,
    username,
    is_online: Boolean(data.is_online),
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const uid = uidGenerator();
    try {
      return await sequelizeInstance.transaction((transaction) =>
        UserModel.create({ ...safeData, uid }, { transaction })
      );
    } catch (error) {
      const conflictField = getUniqueConflictField(error);
      if (conflictField === 'uid') continue;
      if (conflictField) throw conflictForField(conflictField);
      throw error;
    }
  }

  throw conflictForField('uid');
};

const buildProfileUpdates = (currentUser, payload) => {
  const updates = {};

  for (const field of PROFILE_FIELDS) {
    if (!hasOwn(payload, field)) continue;

    if (field === 'show_activity_status') {
      if (typeof payload[field] !== 'boolean') {
        throw new UserIdentityError(
          'Trang thai hoat dong phai la boolean.',
          'INVALID_ACTIVITY_STATUS',
          422,
          field
        );
      }
      if (currentUser[field] !== payload[field]) updates[field] = payload[field];
      continue;
    }

    if (field === 'username') {
      const username = normalizeOptionalUsername(payload.username);
      if ((currentUser.username ?? null) !== username) updates.username = username;
      continue;
    }

    if (currentUser[field] !== payload[field]) updates[field] = payload[field];
  }

  return updates;
};

const updateUserProfile = async (user, payload) => {
  const updates = buildProfileUpdates(user, payload);
  if (Object.keys(updates).length === 0) return user;

  if (hasOwn(updates, 'show_activity_status')) {
    updates.is_online = updates.show_activity_status;
    updates.last_seen_at = updates.show_activity_status ? new Date() : null;
  }

  try {
    await user.update(updates);
    return user;
  } catch (error) {
    const conflictField = getUniqueConflictField(error);
    if (conflictField) throw conflictForField(conflictField);
    throw error;
  }
};

const getUsernameAvailability = async (usernameInput, currentUserId, options = {}) => {
  const UserModel = options.UserModel || User;
  let username;
  try {
    username = normalizeOptionalUsername(usernameInput, { emptyAsNull: false });
  } catch (error) {
    if (!(error instanceof UserIdentityError)) throw error;
    return {
      username: normalizeUsername(usernameInput),
      available: false,
      reason: error.code.replace(/^USERNAME_/, '').toLowerCase(),
    };
  }

  const existing = await UserModel.findOne({
    where: {
      username,
      ...(currentUserId ? { id: { [Op.ne]: currentUserId } } : {}),
    },
    attributes: ['id'],
  });

  return {
    username,
    available: !existing,
    reason: existing ? 'taken' : null,
  };
};

module.exports = {
  UID_GENERATION_ATTEMPTS,
  PROFILE_FIELDS,
  UserIdentityError,
  getUniqueConflictField,
  conflictForField,
  normalizeOptionalUsername,
  createUserWithIdentity,
  buildProfileUpdates,
  updateUserProfile,
  getUsernameAvailability,
};
