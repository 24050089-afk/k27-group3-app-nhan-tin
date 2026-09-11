import client from './client';

export const registerApi = (data) => client.post('/auth/register', data);
export const loginApi = (data) => client.post('/auth/login', data);
export const getMeApi = () => client.get('/auth/me');
export const logoutApi = () => client.post('/auth/logout');
export const changePasswordApi = (data) => client.patch('/auth/change-password', data);
export const forgotPasswordApi = (data) => client.post('/auth/forgot-password', data);
