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

    const alterSchema = process.env.DB_SYNC_ALTER === 'true';
    const syncSchema = alterSchema || process.env.DB_SYNC_SCHEMA === 'true';
    if (syncSchema) {
      await sequelize.sync(alterSchema ? { alter: true } : {});
      console.log(`Models synchronized${alterSchema ? ' with alter enabled' : ' without schema alteration'}.`);
    } else {
      console.log('Schema synchronization disabled; use explicit migration scripts.');
    }

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
