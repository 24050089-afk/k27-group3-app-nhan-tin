const errorMiddleware = (err, req, res, next) => {
  const isFileTooLarge = err.code === 'LIMIT_FILE_SIZE';
  const status = isFileTooLarge ? 413 : err.status || 500;
  const message = isFileTooLarge
    ? 'Ảnh vượt quá giới hạn 10 MB.'
    : err.message || 'Lỗi máy chủ nội bộ.';

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
