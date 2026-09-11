const fs = require('fs');
const path = require('path');
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime']);
const videoError = (status, code, message) => Object.assign(new Error(message), { status, code });

// Inspect container boxes, rather than accepting an arbitrary file with an ftyp prefix.
function hasVideoTrack(buffer) {
  let branded = false;
  let video = false;
  const walk = (start, end, depth) => {
    let offset = start;
    while (offset < end) {
      if (end - offset < 8) return false;
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        if (end - offset < 16) return false;
        const extended = buffer.readBigUInt64BE(offset + 8);
        if (extended > BigInt(Number.MAX_SAFE_INTEGER)) return false;
        size = Number(extended);
        header = 16;
      } else if (size === 0) size = end - offset;
      if (size < header || offset + size > end) return false;
      const payload = offset + header;
      if (depth === 0 && type === 'ftyp' && size >= header + 8) {
        branded = /^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt  )$/.test(buffer.toString('ascii', payload, payload + 4));
      }
      if (depth === 3 && type === 'hdlr' && size >= header + 12
        && buffer.toString('ascii', payload + 8, payload + 12) === 'vide') video = true;
      const containers = ['moov', 'trak', 'mdia'];
      if (type === containers[depth] && !walk(payload, offset + size, depth + 1)) return false;
      offset += size;
    }
    return true;
  };
  return walk(0, buffer.length, 0) && branded && video;
}

async function validateVideoFile(filePath, mime) {
  if (!VIDEO_MIME_TYPES.has(String(mime).toLowerCase())) throw videoError(415, 'INVALID_VIDEO', 'Chỉ hỗ trợ video MP4 hoặc MOV.');
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_VIDEO_BYTES) throw videoError(413, 'VIDEO_TOO_LARGE', 'Video vượt quá giới hạn 25 MB.');
  if (!stat.isFile() || !hasVideoTrack(await fs.promises.readFile(filePath))) throw videoError(415, 'INVALID_VIDEO', 'Tệp MP4/MOV không chứa video hợp lệ.');
  return stat.size;
}

function isVideoAttachment(item) {
  return /^video\//i.test(String(item?.file_type || '')) || /\/chat-videos\/|\.(mp4|mov)(?:[?#]|$)/i.test(String(item?.file_url || ''));
}

async function validateVideoAttachment(item, req) {
  let parsed;
  try { parsed = new URL(String(item?.file_url || '')); } catch { throw videoError(415, 'INVALID_VIDEO', 'Video phải được tải lên trước khi gửi.'); }
  const match = parsed.pathname.match(/^\/uploads\/chat-videos\/([0-9a-f-]+\.(?:mp4|mov))$/i);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password
    || !match || parsed.host.toLowerCase() !== String(req.get('host')).toLowerCase() || item.thumbnail_url) {
    throw videoError(415, 'INVALID_VIDEO', 'Video phải được tải lên trước khi gửi.');
  }
  try {
    item.size = await validateVideoFile(path.join(process.cwd(), 'uploads', 'chat-videos', match[1]), item.file_type);
  } catch (error) {
    if (error.code === 'ENOENT') throw videoError(415, 'INVALID_VIDEO', 'Không tìm thấy video đã tải lên.');
    throw error;
  }
}

module.exports = { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES, videoError, hasVideoTrack, validateVideoFile, isVideoAttachment, validateVideoAttachment };
