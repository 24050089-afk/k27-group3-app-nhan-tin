import { API_BASE_URL } from '../utils/env';
import { getToken } from '../utils/storage';
import { File, Paths } from 'expo-file-system';

export const MAX_CHAT_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_CHAT_VOICE_SIZE = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120000;
const VOICE_FILE_SETTLE_TIMEOUT_MS = 4000;
const VOICE_FILE_SETTLE_INTERVAL_MS = 200;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const deleteFileSafely = (file) => {
  try {
    if (file?.exists) file.delete();
  } catch {
    // Cache cleanup must not replace the upload result.
  }
};

const createStableVoiceUploadFile = async (recording) => {
  if (!recording?.uri) throw new Error('Không tìm thấy tệp ghi âm để gửi.');

  const source = new File(recording.uri);
  const deadline = Date.now() + VOICE_FILE_SETTLE_TIMEOUT_MS;
  let previousSize = -1;
  let stableChecks = 0;

  while (Date.now() < deadline) {
    let currentSize = 0;
    try {
      currentSize = source.exists ? Number(source.size || 0) : 0;
    } catch {
      currentSize = 0;
    }

    if (currentSize > 0 && currentSize === previousSize) stableChecks += 1;
    else stableChecks = 0;

    if (stableChecks >= 2) {
      const staged = new File(Paths.cache, `voice-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.m4a`);
      try {
        source.copy(staged);
        if (staged.exists && Number(staged.size || 0) === currentSize) return staged;
      } catch {
        deleteFileSafely(staged);
      }
    }

    previousSize = currentSize;
    await wait(VOICE_FILE_SETTLE_INTERVAL_MS);
  }

  throw new Error('Bản ghi chưa sẵn sàng để tải lên. Vui lòng thử gửi lại.');
};

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

export const uploadChatVoiceApi = async (recording) => {
  const uploadFile = await createStableVoiceUploadFile(recording);
  const formData = new FormData();
  formData.append('voice', {
    uri: uploadFile.uri,
    type: 'audio/mp4',
    name: uploadFile.name,
  });

  const controller = new AbortController();
  let timeoutId;

  try {
    const token = await getToken();
    timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    const response = await fetch(`${API_BASE_URL}/upload/chat-voice`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = response.status === 413
        ? 'Bản ghi vượt quá giới hạn 10 MB.'
        : payload?.message || `Không thể tải bản ghi lên (${response.status}).`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tải bản ghi lên quá 2 phút. Máy chủ có thể chưa nhận được tệp.');
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    deleteFileSafely(uploadFile);
  }
};

export const MAX_CHAT_VIDEO_SIZE = 25 * 1024 * 1024;

export const uploadChatVideoApi = async (asset) => {
  const file = new File(asset.uri);
  const size = Number(file.size || asset.fileSize || 0);
  if (!Number.isFinite(size) || size <= 0) throw new Error('Không đọc được dung lượng video. Vui lòng chọn lại.');
  if (size > MAX_CHAT_VIDEO_SIZE) throw new Error('Video vượt quá giới hạn 25 MB.');
  const mime = asset.mimeType || (/\.mov$/i.test(asset.fileName || asset.uri) ? 'video/quicktime' : 'video/mp4');
  if (!['video/mp4', 'video/quicktime'].includes(mime)) throw new Error('Chỉ hỗ trợ video MP4 hoặc MOV.');
  const formData = new FormData();
  formData.append('video', { uri: asset.uri, type: mime, name: asset.fileName || `video.${mime === 'video/quicktime' ? 'mov' : 'mp4'}` });
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/upload/chat-video`, {
      method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData, signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 413 ? 'Video vượt quá giới hạn 25 MB.' : payload?.message || 'Không tải được video.');
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Tải video quá 2 phút. Kiểm tra kết nối; video chưa được gửi thành tin nhắn.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
