import { API_BASE_URL } from './env';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const isPrivateHost = (hostname) => {
  const value = String(hostname || '').toLowerCase();
  if (value === 'localhost' || value === '::1' || value.startsWith('127.')) return true;
  if (value.startsWith('10.') || value.startsWith('192.168.')) return true;
  const match = value.match(/^172\.(\d{1,2})\./);
  return !!match && Number(match[1]) >= 16 && Number(match[1]) <= 31;
};

export const resolveMediaUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/uploads/') && isPrivateHost(parsed.hostname)) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }
  return url;
};

export const isPrivateHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'http:' && isPrivateHost(parsed.hostname);
  } catch {
    return false;
  }
};
