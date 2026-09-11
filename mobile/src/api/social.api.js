import client from './client';

export const searchUsersApi = (params) => client.get('/social/users/search', { params });
export const getFriendsApi = () => client.get('/social/friends');
export const getFriendRequestsApi = () => client.get('/social/requests');
export const sendFriendRequestApi = (friendId) =>
  client.post('/social/requests', { friend_id: friendId });
export const respondFriendRequestApi = (id, status) =>
  client.patch(`/social/requests/${id}`, { status });
export const blockUserApi = (blockedUserId) =>
  client.post('/social/blocks', { blocked_user_id: blockedUserId });
export const unblockUserApi = (id) => client.delete(`/social/blocks/${id}`);
export const getRecentFriendSuggestionsApi = (params) => client.get('/social/suggestions/recent', { params });
export const getNearbyStatusApi = () => client.get('/social/nearby/status');
export const startNearbySessionApi = (data) => client.put('/social/nearby/presence', data);
export const searchNearbyUsersApi = (data) => client.post('/social/nearby/search', data);
export const stopNearbySessionApi = () => client.delete('/social/nearby/presence');
