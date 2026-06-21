import axios from 'axios';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../utils/env';
import { networkLogger } from '../utils/networkLogger';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    config._logId = networkLogger.nextId();
    config._startTime = Date.now();
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const body = JSON.stringify(response.data);
      networkLogger.add({
        id: response.config._logId,
        method: (response.config.method || 'GET').toUpperCase(),
        url: response.config.url,
        status: response.status,
        duration: Date.now() - (response.config._startTime || Date.now()),
        size: body.length,
        data: response.data,
        ok: true,
      });
    }
    return response.data;
  },
  (error) => {
    if (__DEV__) {
      networkLogger.add({
        id: error.config?._logId || networkLogger.nextId(),
        method: (error.config?.method || 'GET').toUpperCase(),
        url: error.config?.url || '',
        status: error.response?.status || 0,
        duration: Date.now() - (error.config?._startTime || Date.now()),
        size: 0,
        data: error.response?.data || { message: error.message },
        ok: false,
      });
    }
    const message =
      error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
    return Promise.reject(new Error(message));
  }
);

export default client;
