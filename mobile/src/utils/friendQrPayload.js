export const FRIEND_QR_VERSION = 1;
export const FRIEND_QR_SCHEME = 'proxy';
export const FRIEND_QR_ACTION = 'friend';
export const FRIEND_QR_MAX_LENGTH = 160;
export const PUBLIC_UID_PATTERN = /^LT-[0-9A-HJKMNP-TV-Z]{12}$/;

export class FriendQrPayloadError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FriendQrPayloadError';
    this.code = code;
  }
}

export function normalizePublicUid(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function isValidPublicUid(value) {
  return PUBLIC_UID_PATTERN.test(normalizePublicUid(value));
}

function requireValidUid(value) {
  const uid = normalizePublicUid(value);
  if (!PUBLIC_UID_PATTERN.test(uid)) {
    throw new FriendQrPayloadError('invalid_uid', 'UID tài khoản không hợp lệ.');
  }
  return uid;
}

export function buildFriendQrPayload(value) {
  const uid = requireValidUid(value);
  return `${FRIEND_QR_SCHEME}://${FRIEND_QR_ACTION}/${uid}?v=${FRIEND_QR_VERSION}`;
}

export function parseFriendQrPayload(rawPayload) {
  if (typeof rawPayload !== 'string') {
    throw new FriendQrPayloadError('invalid_type', 'Mã QR phải là văn bản.');
  }

  const payload = rawPayload.trim();
  if (!payload || payload.length > FRIEND_QR_MAX_LENGTH) {
    throw new FriendQrPayloadError(
      payload ? 'payload_too_long' : 'empty_payload',
      payload ? 'Mã QR vượt quá độ dài cho phép.' : 'Mã QR đang trống.'
    );
  }

  let url;
  try {
    url = new URL(payload);
  } catch {
    throw new FriendQrPayloadError('malformed_payload', 'Mã QR không đúng định dạng.');
  }

  if (url.protocol !== `${FRIEND_QR_SCHEME}:`) {
    throw new FriendQrPayloadError('invalid_scheme', 'Mã QR không thuộc Proxy.');
  }
  if (url.hostname.toLowerCase() !== FRIEND_QR_ACTION || url.username || url.password || url.port) {
    throw new FriendQrPayloadError('invalid_action', 'Mã QR không phải mã kết bạn.');
  }
  if (url.hash) {
    throw new FriendQrPayloadError('invalid_fragment', 'Mã QR chứa dữ liệu không được hỗ trợ.');
  }

  const queryKeys = Array.from(url.searchParams.keys());
  if (queryKeys.length !== 1 || queryKeys[0] !== 'v' || url.searchParams.getAll('v').length !== 1) {
    throw new FriendQrPayloadError('invalid_query', 'Mã QR chứa tham số không được hỗ trợ.');
  }
  if (url.searchParams.get('v') !== String(FRIEND_QR_VERSION)) {
    throw new FriendQrPayloadError('unsupported_version', 'Phiên bản mã QR chưa được hỗ trợ.');
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 1) {
    throw new FriendQrPayloadError('invalid_path', 'Mã QR không chứa đúng một UID.');
  }

  let decodedUid;
  try {
    decodedUid = decodeURIComponent(pathParts[0]);
  } catch {
    throw new FriendQrPayloadError('invalid_uid_encoding', 'UID trong mã QR không hợp lệ.');
  }

  const uid = requireValidUid(decodedUid);
  return {
    version: FRIEND_QR_VERSION,
    uid,
    payload: buildFriendQrPayload(uid),
  };
}

export function getUidAccessibilityLabel(value) {
  const uid = normalizePublicUid(value);
  if (!uid) return 'UID chưa sẵn sàng';
  const [prefix, code = ''] = uid.split('-');
  return `UID ${prefix.split('').join(' ')}, ${code.split('').join(' ')}`;
}
