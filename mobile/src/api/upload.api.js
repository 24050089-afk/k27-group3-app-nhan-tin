import { API_BASE_URL } from '../utils/env';
import { getToken } from '../utils/storage';

export const MAX_CHAT_IMAGE_SIZE = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120000;

export const uploadChatImageApi = async (asset) => {
  const formData = new FormData();
  formData.append('image', {
    uri: asset.uri,
    type: asset.mimeType || 'image/jpeg',
    name: asset.fileName || `chat-image-${Date.now()}.jpg`,
  });

  const token = await getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/upload/chat-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || `Không thể tải ảnh lên (${response.status}).`);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tải ảnh lên quá 2 phút. Kiểm tra mạng hoặc thử ảnh nhỏ hơn.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
