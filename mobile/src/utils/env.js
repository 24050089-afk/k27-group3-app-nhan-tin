import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PRODUCTION_API_URL = 'https://your-production-api.com/api';
const DEFAULT_BACKEND_PORT = 4000;

function parseNumericPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : null;
}

function resolveDevHost() {
  const configuredHost = Constants.expoConfig?.extra?.apiHost;
  if (configuredHost) {
    return configuredHost;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
  }

  const debuggerHost = Constants.expoConfig?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

function resolveApiUrl() {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  const backendPort =
    parseNumericPort(Constants.expoConfig?.extra?.apiPort) ||
    parseNumericPort(process.env.EXPO_PUBLIC_API_PORT) ||
    DEFAULT_BACKEND_PORT;

  return `http://${resolveDevHost()}:${backendPort}/api`;
}

export const API_BASE_URL = resolveApiUrl();
