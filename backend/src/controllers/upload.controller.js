const fs = require('fs');
const path = require('path');
const { validateVideoFile } = require('../utils/videoUpload');

const uploadDir = path.join(process.cwd(), 'uploads', 'chat-images');
const voiceUploadDir = path.join(process.cwd(), 'uploads', 'chat-voices');
const videoUploadDir = path.join(process.cwd(), 'uploads', 'chat-videos');

[uploadDir, voiceUploadDir, videoUploadDir].forEach((directory) => {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
});

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const hasIsoBmffSignature = async (filePath) => {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead >= 12 && header.toString('ascii', 4, 8) === 'ftyp';
  } finally {
    await handle.close();
  }
};

const uploadChatImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Khong tim thay tep anh.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = `/uploads/chat-images/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        file_url: `${baseUrl}${relativePath}`,
        file_type: req.file.mimetype,
        size: req.file.size,
        thumbnail_url: `${baseUrl}${relativePath}`,
      },
      message: 'Da tai anh len.',
    });
  } catch (error) {
    next(error);
  }
};

const uploadChatVoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Khong tim thay tep ghi am.' });
    }

    if (!(await hasIsoBmffSignature(req.file.path))) {
      await removeUploadedFile(req.file.path);
      return res.status(415).json({ success: false, message: 'Dinh dang ghi am khong hop le.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = `/uploads/chat-voices/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        file_url: `${baseUrl}${relativePath}`,
        file_type: 'audio/mp4',
        size: req.file.size,
        thumbnail_url: null,
      },
      message: 'Da tai ghi am len.',
    });
  } catch (error) {
    try {
      await removeUploadedFile(req.file?.path);
    } catch {
      // Preserve the original upload error.
    }
    next(error);
  }
};

const uploadChatVideo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, code: 'VIDEO_REQUIRED', message: 'Chưa chọn video.' });
    await validateVideoFile(req.file.path, req.file.mimetype);
    return res.status(201).json({ success: true, data: {
      file_url: `${req.protocol}://${req.get('host')}/uploads/chat-videos/${req.file.filename}`,
      file_type: req.file.mimetype.toLowerCase(), size: req.file.size, thumbnail_url: null,
    }, message: 'Đã tải video lên.' });
  } catch (error) {
    try { await removeUploadedFile(req.file?.path); } catch { /* Preserve validation error. */ }
    next(error);
  }
};

module.exports = {
  videoUploadDir,
  uploadChatVideo,
  uploadDir,
  voiceUploadDir,
  uploadChatImage,
  uploadChatVoice,
};
