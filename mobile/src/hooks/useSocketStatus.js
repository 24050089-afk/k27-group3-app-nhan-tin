import { useEffect, useState } from 'react';
import { getSocket } from '../api/socket';

export default function useSocketStatus() {
  const socket = getSocket();
  const [connected, setConnected] = useState(() => Boolean(socket?.connected));

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return undefined;
    }

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    setConnected(socket.connected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return connected;
}
