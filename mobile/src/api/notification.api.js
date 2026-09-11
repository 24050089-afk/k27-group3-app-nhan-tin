import client from './client';

export const getNotificationsApi = ({ cursor, limit = 30, unreadOnly = false, category } = {}) => client.get('/notifications', {
  params: { cursor: cursor || undefined, limit, unread_only: unreadOnly || undefined, category: category || undefined },
});
export const getNotificationUnreadCountApi = () => client.get('/notifications/unread-count');
export const markNotificationReadApi = (id) => client.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadApi = (data = {}) => client.post('/notifications/read-all', data);
export const getNotificationPreferencesApi = () => client.get('/notification-preferences');
export const updateNotificationPreferencesApi = (data) => client.patch('/notification-preferences', data);
export const upsertPushDeviceApi = (installationId, data) => client.put(`/push-devices/${encodeURIComponent(installationId)}`, data);
export const revokePushDeviceApi = (installationId) => client.delete(`/push-devices/${encodeURIComponent(installationId)}`);
