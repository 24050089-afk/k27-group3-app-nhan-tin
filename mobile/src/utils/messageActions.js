import { resolveMediaUrl } from './mediaUrl';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];
const AUDIO_EXTENSIONS = ['m4a', 'aac'];

const getExtension = (url) => {
  const clean = String(url || '').split('?')[0].split('#')[0];
  const name = clean.split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

export const getAttachmentMediaKind = (attachment, messageType) => {
  const mime = String(attachment?.file_type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  const extension = getExtension(attachment?.file_url);
  if (IMAGE_EXTENSIONS.includes(extension)) return 'photo';
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (!mime && messageType === 'image') return 'photo';
  if (!mime && messageType === 'video') return 'video';
  return null;
};

export const getMediaAttachments = (message) => (
  (message?.attachments || []).filter((attachment) => getAttachmentMediaKind(attachment, message?.type))
);

export const isVoiceAttachment = (attachment, messageType) => {
  const mime = String(attachment?.file_type || '').toLowerCase();
  if (mime.startsWith('audio/')) return true;
  const extension = getExtension(attachment?.file_url);
  if (AUDIO_EXTENSIONS.includes(extension)) return true;
  return !mime && messageType === 'voice';
};

export const hasServerMessageId = (message) => {
  if (message?.id === null || message?.id === undefined) return false;
  const id = String(message.id);
  return id.length > 0 && !id.startsWith('temp-') && !message.temporary;
};

export const isPersistedMessage = (message) => (
  hasServerMessageId(message) && !message?.sending && !message?.failed
);

export const sanitizeForwardPayload = (message) => {
  const attachments = (message?.attachments || [])
    .filter((item) => item?.file_url)
    .map((item) => ({
      file_url: resolveMediaUrl(item.file_url),
      file_type: item.file_type || null,
      size: item.size || null,
      thumbnail_url: item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : null,
    }));
  const content = String(message?.content || '');
  if (!content.trim() && attachments.length === 0) return null;
  return { content, type: message?.type || 'text', attachments };
};

export { getExtension };
