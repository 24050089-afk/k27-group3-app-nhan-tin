const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadChatImage, uploadDir } = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

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

router.use(protect);
router.post('/chat-image', upload.single('image'), uploadChatImage);

module.exports = router;
