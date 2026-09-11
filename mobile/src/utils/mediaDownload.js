import { Directory, File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAttachmentMediaKind, getExtension } from './messageActions';
import { isPrivateHttpUrl, resolveMediaUrl } from './mediaUrl';
import { beginAttachmentDownload, endAttachmentDownload } from './attachmentCache';

const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream']);
let mediaLibraryModule = null;
const getMediaLibrary = () => {
  if (!mediaLibraryModule) mediaLibraryModule = require('expo-media-library');
  return mediaLibraryModule;
};

const mimeToFormat = (mime) => {
  const value = String(mime || '').toLowerCase().split(';')[0].trim();
  const formats = {
    'image/jpeg': { extension: 'jpg', kind: 'photo' },
    'image/png': { extension: 'png', kind: 'photo' },
    'image/gif': { extension: 'gif', kind: 'photo' },
    'image/webp': { extension: 'webp', kind: 'photo' },
    'image/heic': { extension: 'heic', kind: 'photo' },
    'image/heif': { extension: 'heif', kind: 'photo' },
    'video/mp4': { extension: 'mp4', kind: 'video' },
    'video/quicktime': { extension: 'mov', kind: 'video' },
    'video/webm': { extension: 'webm', kind: 'video' },
  };
  return formats[value] || null;
};

const extensionToFormat = (extension) => {
  const value = String(extension || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(value)) {
    return { extension: value === 'jpeg' ? 'jpg' : value, kind: 'photo' };
  }
  if (['mp4', 'm4v', 'mov', 'webm'].includes(value)) {
    return { extension: value === 'm4v' ? 'mp4' : value, kind: 'video' };
  }
  return null;
};

const ascii = (bytes, start, length) => String.fromCharCode(...Array.from(bytes.slice(start, start + length)));

const detectSignature = (file) => {
  const handle = file.open();
  try {
    const bytes = handle.readBytes(20);
    if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { extension: 'jpg', kind: 'photo' };
    if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return { extension: 'png', kind: 'photo' };
    if (bytes.length >= 6 && ascii(bytes, 0, 4) === 'GIF8') return { extension: 'gif', kind: 'photo' };
    if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return { extension: 'webp', kind: 'photo' };
    if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
      const brand = ascii(bytes, 8, 4).toLowerCase();
      if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return { extension: 'heic', kind: 'photo' };
      if (brand === 'qt  ') return { extension: 'mov', kind: 'video' };
      return { extension: 'mp4', kind: 'video' };
    }
    if (bytes.length >= 4 && bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return { extension: 'webm', kind: 'video' };
    return null;
  } finally {
    handle.close();
  }
};

const getRemoteContentType = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!response.ok) return '';
    return String(response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
};

const downloadPrivateMedia = async (url, destination) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Máy chủ media trả về HTTP ${response.status}.`);
      error.code = `media-http-${response.status}`;
      throw error;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    destination.create({ overwrite: true, intermediates: true });
    destination.write(bytes);
    return destination;
  } catch (cause) {
    if (cause?.code?.startsWith?.('media-http-')) throw cause;
    const host = (() => {
      try { return new URL(url).host; } catch { return 'không xác định'; }
    })();
    const error = new Error(`Không kết nối được máy chủ media ${host}. Kiểm tra lại Wi-Fi và địa chỉ API.`);
    error.code = 'media-network-error';
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const assertCurrentSession = (isSessionCurrent) => {
  if (!isSessionCurrent()) {
    const error = new Error('Phiên tải đã bị hủy.');
    error.code = 'session-cancelled';
    throw error;
  }
};

const validateFreeSpace = (attachment) => {
  const declaredSize = Number(attachment?.size);
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) return;
  if (Paths.availableDiskSpace < declaredSize * 1.2) {
    const error = new Error('Thiết bị không còn đủ dung lượng trống để tải phương tiện này.');
    error.code = 'insufficient-storage';
    throw error;
  }
};

const ensurePermission = async () => {
  if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
    const error = new Error('Expo Go không hỗ trợ đầy đủ quyền lưu phương tiện trên Android hiện tại. Hãy dùng development build để kiểm tra tải ảnh và video.');
    error.code = 'expo-go-unsupported';
    throw error;
  }
  const MediaLibrary = getMediaLibrary();
  if (!(await MediaLibrary.isAvailableAsync())) {
    const error = new Error('Thư viện ảnh và video không khả dụng trên thiết bị này.');
    error.code = 'media-library-unavailable';
    throw error;
  }
  // Download chỉ tạo file mới trong thư viện. Yêu cầu write-only tránh xin
  // quyền đọc photo/video, vốn bị Expo Go từ chối trên Android 13 trở lên.
  let response;
  try {
    response = await MediaLibrary.requestPermissionsAsync(true);
  } catch (cause) {
    const isExpoGoLimitation = String(cause?.message || '').toLowerCase().includes('expo go');
    const error = new Error(isExpoGoLimitation
      ? 'Expo Go không hỗ trợ quyền thư viện này. Hãy dùng development build để kiểm tra tải phương tiện.'
      : 'Không thể yêu cầu quyền lưu phương tiện trên thiết bị này.');
    error.code = 'permission-request-failed';
    throw error;
  }
  if (!response.granted) {
    const error = new Error('Proxy cần quyền lưu ảnh và video vào thư viện thiết bị.');
    error.code = 'permission-denied';
    error.canAskAgain = response.canAskAgain;
    throw error;
  }
};

const downloadOne = async ({ attachment, messageType, directory, uniqueName, isSessionCurrent }) => {
  const MediaLibrary = getMediaLibrary();
  assertCurrentSession(isSessionCurrent);
  validateFreeSpace(attachment);
  const declaredKind = getAttachmentMediaKind(attachment, messageType);
  if (!declaredKind || !attachment?.file_url) throw new Error('Phương tiện không có URL hợp lệ.');
  const mediaUrl = resolveMediaUrl(attachment.file_url);

  const remoteMime = await getRemoteContentType(mediaUrl);
  assertCurrentSession(isSessionCurrent);
  const temporary = new File(directory, `${uniqueName}.download`);
  let downloaded = null;
  try {
    downloaded = isPrivateHttpUrl(mediaUrl)
      ? await downloadPrivateMedia(mediaUrl, temporary)
      : await File.downloadFileAsync(mediaUrl, temporary, { idempotent: true });
    assertCurrentSession(isSessionCurrent);
    const signature = detectSignature(downloaded);
    const remoteFormat = GENERIC_MIME_TYPES.has(remoteMime) ? null : mimeToFormat(remoteMime);
    const attachmentFormat = mimeToFormat(attachment.file_type);
    const urlFormat = extensionToFormat(getExtension(mediaUrl));
    const resolved = signature || remoteFormat || attachmentFormat || urlFormat;
    if (!resolved) throw new Error('Không nhận diện được định dạng phương tiện.');
    if (signature && declaredKind !== signature.kind) {
      throw new Error('Định dạng thực tế của file không khớp loại phương tiện trong tin nhắn.');
    }
    if (signature && remoteFormat && signature.kind !== remoteFormat.kind) {
      throw new Error('Nội dung file không khớp Content-Type từ máy chủ.');
    }
    const finalName = `${uniqueName}.${resolved.extension}`;
    downloaded.rename(finalName);
    assertCurrentSession(isSessionCurrent);
    await MediaLibrary.saveToLibraryAsync(downloaded.uri);
    return { attachment, saved: true };
  } finally {
    try {
      if (downloaded?.exists) downloaded.delete();
      else if (temporary.exists) temporary.delete();
    } catch {
      // Cache cleanup failure must not hide the actual download result.
    }
  }
};

export const downloadMediaToLibrary = async ({
  attachments,
  messageType,
  sessionId,
  isSessionCurrent,
  onProgress,
}) => {
  const media = attachments.filter((attachment) => getAttachmentMediaKind(attachment, messageType));
  if (!media.length) throw new Error('Tin nhắn không có ảnh hoặc video có thể tải.');
  await ensurePermission();
  beginAttachmentDownload();
  try {
    const directory = new Directory(Paths.cache, 'lt-media-downloads');
    directory.create({ intermediates: true, idempotent: true });
    const results = [];

    for (let index = 0; index < media.length; index += 1) {
      assertCurrentSession(isSessionCurrent);
      onProgress?.({ completed: index, total: media.length });
      try {
        const result = await downloadOne({
          attachment: media[index],
          messageType,
          directory,
          uniqueName: `lt-${sessionId}-${index + 1}`,
          isSessionCurrent,
        });
        results.push(result);
      } catch (error) {
        if (error.code === 'session-cancelled') throw error;
        results.push({ attachment: media[index], saved: false, error });
      }
      onProgress?.({ completed: index + 1, total: media.length });
    }
    return results;
  } finally {
    endAttachmentDownload();
  }
};
