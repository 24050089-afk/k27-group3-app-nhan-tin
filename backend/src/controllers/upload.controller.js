const fs = require('fs');
const path = require('path');

const uploadDir = path.join(process.cwd(), 'uploads', 'chat-images');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

module.exports = {
  uploadDir,
  uploadChatImage,
};
