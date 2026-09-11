import client from './client';

export const updateMyProfileApi = (payload) => client.patch('/users/me', payload);

export const checkUsernameAvailabilityApi = (username) =>
  client.get('/users/username-availability', { params: { username } });
