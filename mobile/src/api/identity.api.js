import client from './client';

export const resolveFriendQrApi = ({ version, uid }) =>
  client.post('/social/qr/resolve', { version, uid });
