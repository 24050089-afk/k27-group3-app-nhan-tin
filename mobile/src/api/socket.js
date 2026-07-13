import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/env';

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket = null;

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_BASE_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
