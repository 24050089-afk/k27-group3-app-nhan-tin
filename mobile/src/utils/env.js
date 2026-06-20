import Constants from 'expo-constants';

/**
 * Tự động phát hiện host của BE dựa theo môi trường chạy Expo:
 *
 * - Expo Go trên thiết bị thật (LAN): lấy IP từ debuggerHost của dev server
 * - Android emulator:                 10.0.2.2 (ADB loopback)
 * - iOS simulator:                    localhost
 * - Production build:                 dùng PRODUCTION_API_URL
 */
const PRODUCTION_API_URL = 'https://your-production-api.com/api';
const BACKEND_PORT = 3000;

function resolveApiUrl() {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // Expo SDK 50+: hostUri có dạng "192.168.x.x:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${BACKEND_PORT}/api`;
  }

  // Fallback cứng — Android emulator
  return `http://10.0.2.2:${BACKEND_PORT}/api`;
}

export const API_BASE_URL = resolveApiUrl();
