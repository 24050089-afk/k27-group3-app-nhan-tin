const crypto = require('crypto');

const tokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const encryptionKey = () => {
  const raw = String(process.env.PUSH_TOKEN_ENCRYPTION_KEY || '');
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) return decoded;
  } catch {}
  return null;
};

const encryptPushToken = (token) => {
  const key = encryptionKey();
  if (!key) throw new Error('PUSH_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value or 64-character hex value.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
};

const decryptPushToken = (value) => {
  const key = encryptionKey();
  if (!key || typeof value !== 'string') return null;
  const [version, ivValue, tagValue, ciphertextValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return null; }
};

module.exports = { tokenHash, encryptPushToken, decryptPushToken };
