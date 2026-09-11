import axios from 'axios';
import { clearAuth, getToken } from '../utils/storage';
import { API_BASE_URL } from '../utils/env';
import { networkLogger } from '../utils/networkLogger';

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

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
        url: `${response.config.baseURL || ''}${response.config.url || ''}`,
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
    if (error.response?.status === 401) {
      if (unauthorizedHandler) unauthorizedHandler();
      else clearAuth().catch(() => {});
    }

    if (__DEV__) {
      networkLogger.add({
        id: error.config?._logId || networkLogger.nextId(),
        method: (error.config?.method || 'GET').toUpperCase(),
        url: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        status: error.response?.status || 0,
        duration: Date.now() - (error.config?._startTime || Date.now()),
        size: 0,
        data: error.response?.data || { message: error.message },
        ok: false,
      });
    }

    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    const message =
      error.response?.data?.message ||
      (timedOut
        ? 'Yêu cầu mất quá nhiều thời gian. Kiểm tra mạng rồi thử lại.'
        : error.request
          ? `Không kết nối được API: ${API_BASE_URL}`
          : 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status || 0;
    normalizedError.data = error.response?.data || null;
    normalizedError.code = error.response?.data?.code || error.code || null;
    normalizedError.transportCode = error.code || null;
    return Promise.reject(normalizedError);
  }
);

export default client;
