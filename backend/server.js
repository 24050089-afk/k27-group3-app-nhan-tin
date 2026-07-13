require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { sequelize } = require('./src/models');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    await sequelize.sync({ alter: true });
    console.log('Models synchronized.');

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: '*' },
    });
    initSocket(io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
