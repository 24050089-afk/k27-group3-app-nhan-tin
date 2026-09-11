const jwt = require('jsonwebtoken');
const { User, ConversationMember } = require('./models');
const { sequelize } = require('./models');
const { lockConversationAccess } = require('./services/groupPermission.service');

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

    socket.on('conversation:join', async (payload, acknowledge) => {
      const conversationId = Number(payload?.conversationId);
      const reply = (data) => { if (typeof acknowledge === 'function') acknowledge(data); };
      if (!Number.isSafeInteger(conversationId) || conversationId < 1) return reply({ success: false });
      try {
        await sequelize.transaction(async (transaction) => {
          await lockConversationAccess(conversationId, socket.user.id, transaction);
          if (socket.connected) await socket.join(`conversation:${conversationId}`);
        });
        reply({ success: true });
      } catch {
        await socket.leave(`conversation:${conversationId}`);
        reply({ success: false });
      }
    });

    socket.on('conversation:leave', (payload) => {
      const conversationId = Number(payload?.conversationId);
      if (Number.isSafeInteger(conversationId)) socket.leave(`conversation:${conversationId}`);
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

const removeUserFromConversation = async (userId, conversationId) => {
  if (!ioInstance) return;
  try {
    const sockets = await ioInstance.in(`user:${userId}`).fetchSockets();
    await Promise.all(sockets.map((socket) => socket.leave(`conversation:${Number(conversationId)}`)));
  } catch (error) {
    ioInstance.in(`user:${userId}`).disconnectSockets(true);
    throw error;
  }
};

module.exports = {
  initSocket,
  getIo,
  emitConversationEvent,
  emitUserEvent,
  removeUserFromConversation,
};
