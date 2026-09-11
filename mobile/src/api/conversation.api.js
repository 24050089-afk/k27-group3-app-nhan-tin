import client from './client';

export const getConversationsApi = () => client.get('/conversations');
export const getConversationApi = (id) => client.get(`/conversations/${id}`);
export const getConversationMediaApi = (id, params) => client.get(`/conversations/${id}/media`, { params });
export const createPrivateConversationApi = (friendId) =>
  client.post('/conversations/private', { friend_id: friendId });
export const createGroupConversationApi = (data) => client.post('/conversations/groups', data);
export const updateConversationApi = (id, data) => client.patch(`/conversations/${id}`, data);
export const updateGroupPermissionsApi = (id, data) => client.patch(`/conversations/${id}/permissions`, data);
export const updateConversationSettingsApi = (id, data) =>
  client.patch(`/conversations/${id}/settings`, data);
export const leaveConversationApi = (id) => client.delete(`/conversations/${id}/members/me`);

export const getMessagesApi = (conversationId, params) =>
  client.get(`/conversations/${conversationId}/messages`, { params });
export const sendMessageApi = (conversationId, data) =>
  client.post(`/conversations/${conversationId}/messages`, data);
export const markConversationSeenApi = (conversationId) =>
  client.patch(`/conversations/${conversationId}/seen`);

export const editMessageApi = (id, content) => client.patch(`/messages/${id}`, { content });
export const recallMessageApi = (id) => client.patch(`/messages/${id}/recall`);
export const reactToMessageApi = (id, type) => client.post(`/messages/${id}/reactions`, { type });
export const removeReactionApi = (id) => client.delete(`/messages/${id}/reactions/me`);
