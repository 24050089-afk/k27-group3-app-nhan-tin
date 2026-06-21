import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://your-production-api.com/api';
const BACKEND_PORT = 3000;

// Đặt IP WiFi của máy chạy BE ở đây (dùng khi --tunnel hoặc hostUri không phải LAN IP)
const DEV_MACHINE_IP = '192.168.0.53';

function resolveApiUrl() {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    // Chỉ dùng host từ hostUri nếu trông như IPv4 (ví dụ: 192.168.x.x)
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (isLanIp) {
      return `http://${host}:${BACKEND_PORT}/api`;
    }
  }

  // Fallback: dùng IP WiFi cố định (tunnel mode hoặc Docker host)
  return `http://${DEV_MACHINE_IP}:${BACKEND_PORT}/api`;
}

export const API_BASE_URL = resolveApiUrl();
