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
