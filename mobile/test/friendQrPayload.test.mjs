import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRIEND_QR_MAX_LENGTH,
  FriendQrPayloadError,
  buildFriendQrPayload,
  getUidAccessibilityLabel,
  isValidPublicUid,
  normalizePublicUid,
  parseFriendQrPayload,
} from '../src/utils/friendQrPayload.js';

const UID = 'LT-7K9M2Q4WX8NP';

test('normalizes and validates a public UID', () => {
  assert.equal(normalizePublicUid(`  ${UID.toLowerCase()}  `), UID);
  assert.equal(isValidPublicUid(UID), true);
  assert.equal(isValidPublicUid('LT-ILOU12345678'), false);
});

test('builds and parses the canonical v1 friend payload', () => {
  const payload = buildFriendQrPayload(UID.toLowerCase());
  assert.equal(payload, `proxy://friend/${UID}?v=1`);
  assert.deepEqual(parseFriendQrPayload(payload), { version: 1, uid: UID, payload });
});

test('rejects non-Proxy, unsupported and ambiguous payloads', () => {
  const invalidPayloads = [
    `https://example.com/friend/${UID}?v=1`,
    `javascript:alert(1)`,
    `proxy://profile/${UID}?v=1`,
    `proxy://friend/${UID}?v=2`,
    `proxy://friend/${UID}?v=1&next=https://example.com`,
    `proxy://friend/${UID}/${UID}?v=1`,
    `proxy://friend/LT-ILOU12345678?v=1`,
    `proxy://friend/${UID}?v=1#fragment`,
  ];
  invalidPayloads.forEach((payload) => {
    assert.throws(() => parseFriendQrPayload(payload), FriendQrPayloadError);
  });
});

test('rejects empty, non-string and oversized payloads', () => {
  assert.throws(() => parseFriendQrPayload(''), FriendQrPayloadError);
  assert.throws(() => parseFriendQrPayload(null), FriendQrPayloadError);
  assert.throws(() => parseFriendQrPayload('x'.repeat(FRIEND_QR_MAX_LENGTH + 1)), FriendQrPayloadError);
});

test('creates a screen-reader-friendly UID label', () => {
  assert.equal(getUidAccessibilityLabel(UID), 'UID L T, 7 K 9 M 2 Q 4 W X 8 N P');
});
