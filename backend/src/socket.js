const jwt = require('jsonwebtoken');
const { User, ConversationMember } = require('./models');

let ioInstance = null;

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on('conversation:join', async ({ conversationId }) => {
      const member = await ConversationMember.findOne({
        where: { conversation_id: Number(conversationId), user_id: socket.user.id },
      });
      if (member) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });

  ioInstance = io;
  return io;
};

const getIo = () => ioInstance;

const emitConversationEvent = (conversationId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`conversation:${conversationId}`).emit(event, payload);
};

const emitUserEvent = (userId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

module.exports = {
  initSocket,
  getIo,
  emitConversationEvent,
  emitUserEvent,
};
