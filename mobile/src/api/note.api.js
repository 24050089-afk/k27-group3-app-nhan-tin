import client from './client';

export const getMyNoteApi = () => client.get('/notes/me');
export const getNotesFeedApi = (params) => client.get('/notes/feed', { params });
export const createNoteApi = (data) => client.post('/notes', data);
export const getNoteApi = (id) => client.get(`/notes/${id}`);
export const deleteNoteApi = (id) => client.delete(`/notes/${id}`);
export const getNoteViewersApi = (id) => client.get(`/notes/${id}/viewers`);
export const replyToNoteApi = (id, message) => client.post(`/notes/${id}/reply`, { message });
