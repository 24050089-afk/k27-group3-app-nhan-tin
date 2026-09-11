const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const {
  uploadChatImage,
  uploadChatVoice,
  uploadDir,
  voiceUploadDir,
  videoUploadDir,
  uploadChatVideo,
} = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
const { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES, videoError } = require('../utils/videoUpload');
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, videoUploadDir),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${file.mimetype.toLowerCase() === 'video/quicktime' ? '.mov' : '.mp4'}`),
  }),
  // Busboy emits its limit event at equality; the controller checks the inclusive maximum.
  limits: { files: 1, fileSize: MAX_VIDEO_BYTES + 1 },
  fileFilter: (_req, file, cb) => VIDEO_MIME_TYPES.has(String(file.mimetype).toLowerCase())
    ? cb(null, true) : cb(videoError(415, 'INVALID_VIDEO', 'Chỉ hỗ trợ video MP4 hoặc MOV.')),
}).single('video');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chi ho tro tep anh.'));
    }
    cb(null, true);
  },
});

const voiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, voiceUploadDir),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.m4a`),
});

const voiceUpload = multer({
  storage: voiceStorage,
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a']);
    if (!allowed.has(String(file.mimetype || '').toLowerCase())) {
      const error = new Error('Chi ho tro tep ghi am M4A/AAC.');
      error.status = 415;
      return cb(error);
    }
    cb(null, true);
  },
});

router.use(protect);
router.post('/chat-video', (req, res, next) => videoUpload(req, res, (error) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return next(videoError(413, 'VIDEO_TOO_LARGE', 'Video vượt quá giới hạn 25 MB.'));
  if (error) return next(error.status ? error : videoError(400, 'INVALID_VIDEO_UPLOAD', 'Chỉ tải lên một video mỗi lần.'));
  next();
}), uploadChatVideo);
router.post('/chat-image', upload.single('image'), uploadChatImage);
router.post('/chat-voice', voiceUpload.single('voice'), uploadChatVoice);

module.exports = router;
