import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSocket } from '../api/socket';
import {
  getNotificationPreferencesApi,
  getNotificationUnreadCountApi,
  revokePushDeviceApi,
  updateNotificationPreferencesApi,
  upsertPushDeviceApi,
} from '../api/notification.api';
import { getPushInstallationId } from '../utils/pushInstallation';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
const isExpoGo = Constants.appOwnership === 'expo';
const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';
const pushSupported = !isExpoGoAndroid && Platform.OS !== 'web';
const Notifications = pushSupported ? require('expo-notifications') : null;
let activeConversationId = null;

export const setActiveNotificationConversation = (conversationId) => {
  activeConversationId = conversationId === null || conversationId === undefined ? null : String(conversationId);
};

Notifications?.setNotificationHandler({
  handleNotification: async (notification) => {
    const conversationId = notification.request.content.data?.conversationId;
    const isOpenConversation = conversationId && String(conversationId) === activeConversationId;
    return { shouldShowBanner: !isOpenConversation, shouldShowList: !isOpenConversation, shouldPlaySound: false, shouldSetBadge: false };
  },
});

const projectId = () => Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId || null;
const isConfiguredProjectId = (value) => Boolean(value && value !== 'your-eas-project-id');
let pendingNotificationIntent = null;
const navigateNotification = (data) => {
  if (!data) return false;
  if (!navigationRef.isReady()) {
    pendingNotificationIntent = data;
    return false;
  }
  if (data.conversationId) navigationRef.navigate('Chat', { conversationId: Number(data.conversationId) || data.conversationId });
  else if (data.relatedType === 'friendship') navigationRef.navigate('Main', { screen: 'Friends', params: { initialTab: 'requests' } });
  return true;
};

export const flushPendingNotificationIntent = () => {
  if (!pendingNotificationIntent || !navigationRef.isReady()) return;
  const intent = pendingNotificationIntent;
  pendingNotificationIntent = null;
  navigateNotification(intent);
};

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);
  const [permission, setPermission] = useState(null);
  const [pushStatus, setPushStatus] = useState('idle');
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refreshUnreadCount = useCallback(async () => {
    if (!tokenRef.current) return 0;
    try {
      const response = await getNotificationUnreadCountApi();
      const count = Number(response?.data?.count || 0);
      setUnreadCount(count);
      return count;
    } catch (error) {
      if (error.status !== 503) throw error;
      setUnreadCount(0);
      return 0;
    }
  }, []);

  const refreshPreferences = useCallback(async () => {
    if (!tokenRef.current) return null;
    try {
      const response = await getNotificationPreferencesApi();
      setPreferences(response.data);
      return response.data;
    } catch (error) {
      if (error.status !== 503) throw error;
      setPreferences(null);
      return null;
    }
  }, []);

  const refreshPermission = useCallback(async () => {
    if (!Notifications) {
      const result = { status: 'unavailable', granted: false, canAskAgain: false };
      setPermission(result);
      setPushStatus(isExpoGoAndroid ? 'expo_go_unsupported' : 'unsupported');
      return result;
    }
    const result = await Notifications.getPermissionsAsync();
    setPermission(result);
    return result;
  }, []);

  const registerForPush = useCallback(async ({ requestPermission = false } = {}) => {
    if (!tokenRef.current) return { registered: false, reason: 'signed_out' };
    if (!Notifications) return { registered: false, reason: isExpoGoAndroid ? 'expo_go_unsupported' : 'unsupported' };
    if (!Device.isDevice) return { registered: false, reason: 'simulator' };
    const currentProjectId = projectId();
    if (!isConfiguredProjectId(currentProjectId)) return { registered: false, reason: 'project_unconfigured' };
    setPushStatus('registering');
    try {
      let permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted && requestPermission) permissions = await Notifications.requestPermissionsAsync();
      setPermission(permissions);
      const installationId = await getPushInstallationId();
      if (!permissions.granted) {
        await upsertPushDeviceApi(installationId, {
          platform: Platform.OS,
          permission_status: permissions.status || 'denied',
        });
        setPushStatus('denied');
        return { registered: false, reason: 'permission_denied', canAskAgain: permissions.canAskAgain };
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', { name: 'Tin nhan', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250] });
        await Notifications.setNotificationChannelAsync('social', { name: 'Ban be', importance: Notifications.AndroidImportance.DEFAULT });
      }
      const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: currentProjectId });
      await upsertPushDeviceApi(installationId, {
        expo_push_token: expoToken.data,
        platform: Platform.OS,
        project_id: currentProjectId,
        permission_status: 'granted',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        locale: Intl.DateTimeFormat().resolvedOptions().locale || null,
        app_version: Constants.expoConfig?.version || null,
      });
      setPushStatus('registered');
      return { registered: true };
    } catch (error) {
      setPushStatus('error');
      return { registered: false, reason: 'error', error };
    }
  }, []);

  const sendLocalTestNotification = useCallback(async () => {
    if (!Notifications) return { scheduled: false, reason: isExpoGoAndroid ? 'expo_go_unsupported' : 'unsupported' };
    try {
      let permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) permissions = await Notifications.requestPermissionsAsync();
      setPermission(permissions);
      if (!permissions.granted) return { scheduled: false, reason: 'permission_denied', canAskAgain: permissions.canAskAgain };
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Tin nhắn',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
        });
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Thông báo thử từ Proxy',
          body: 'Development build đã nhận được thông báo cục bộ.',
          data: { type: 'local_test', v: 1 },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: Platform.OS === 'android' ? 'messages' : undefined,
        },
      });
      return { scheduled: true };
    } catch (error) {
      return { scheduled: false, reason: 'error', error };
    }
  }, []);

  const updatePreferences = useCallback(async (patch) => {
    const response = await updateNotificationPreferencesApi(patch);
    setPreferences(response.data);
    return response.data;
  }, []);

  const revokeCurrentDevice = useCallback(async () => {
    try {
      const installationId = await getPushInstallationId();
      await revokePushDeviceApi(installationId);
    } catch {
      // Logout must continue even if a best-effort remote revocation cannot reach the server.
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      setPreferences(null);
      return undefined;
    }
    refreshUnreadCount().catch(() => {});
    refreshPreferences().catch(() => {});
    refreshPermission().catch(() => {});
    const socket = getSocket();
    const onNotification = ({ unreadCountDelta }) => setUnreadCount((count) => Math.max(0, count + Number(unreadCountDelta || 1)));
    socket?.on('notification:new', onNotification);
    const appStateSubscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshUnreadCount().catch(() => {}); });
    const responseSubscription = Notifications?.addNotificationResponseReceivedListener((response) => navigateNotification(response.notification.request.content.data));
    Notifications?.getLastNotificationResponseAsync().then((response) => { if (response) navigateNotification(response.notification.request.content.data); }).catch(() => {});
    return () => {
      socket?.off('notification:new', onNotification);
      appStateSubscription.remove();
      responseSubscription?.remove();
    };
  }, [token, user?.id, refreshPermission, refreshPreferences, refreshUnreadCount]);

  const value = useMemo(() => ({ pushSupported, isExpoGo: isExpoGoAndroid, unreadCount, preferences, permission, pushStatus, refreshUnreadCount, refreshPreferences, refreshPermission, registerForPush, sendLocalTestNotification, updatePreferences, revokeCurrentDevice }), [unreadCount, preferences, permission, pushStatus, refreshUnreadCount, refreshPreferences, refreshPermission, registerForPush, sendLocalTestNotification, updatePreferences, revokeCurrentDevice]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => React.useContext(NotificationContext);
