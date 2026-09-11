import { Directory, Paths } from 'expo-file-system';

const cacheDirectory = () => new Directory(Paths.cache, 'lt-media-downloads');
let activeDownloadBatches = 0;

export const beginAttachmentDownload = () => {
  activeDownloadBatches += 1;
};

export const endAttachmentDownload = () => {
  activeDownloadBatches = Math.max(0, activeDownloadBatches - 1);
};

export const formatStorageSize = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

export const getAttachmentCacheInfo = async () => {
  const directory = cacheDirectory();
  if (!directory.exists) {
    return { bytes: 0, files: 0, activeDownloads: activeDownloadBatches, availableBytes: Number(Paths.availableDiskSpace) || 0 };
  }

  return {
    bytes: Number(directory.size) || 0,
    files: directory.list().length,
    activeDownloads: activeDownloadBatches,
    availableBytes: Number(Paths.availableDiskSpace) || 0,
  };
};

export const clearAttachmentCache = async () => {
  if (activeDownloadBatches > 0) {
    const error = new Error('Đang tải tệp. Hãy dọn bộ nhớ tạm sau khi tải xong.');
    error.code = 'attachment-download-active';
    throw error;
  }
  const directory = cacheDirectory();
  if (directory.exists) directory.delete();
  return getAttachmentCacheInfo();
};
