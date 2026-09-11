import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Linking, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../store/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import GroupPermissionsScreen from '../screens/GroupPermissionsScreen';
import PrivateConversationInfoScreen from '../screens/PrivateConversationInfoScreen';
import SharedMediaScreen from '../screens/SharedMediaScreen';
import NewChatScreen from '../screens/NewChatScreen';
import FriendsScreen from '../screens/FriendsScreen';
import QrFriendScannerScreen from '../screens/QrFriendScannerScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import AttachmentSettingsScreen from '../screens/AttachmentSettingsScreen';
import { useTheme } from '../store/ThemeContext';
import LoadingState from '../components/LoadingState';
import { iconSize, layout, spacing, typography } from '../theme/tokens';
import { parseFriendQrPayload } from '../utils/friendQrPayload';
import { navigationRef } from './navigationRef';
import { flushPendingNotificationIntent } from '../store/NotificationContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const screenFadeOptions = Platform.select({
  ios: { animation: 'fade', animationDuration: 500 },
  android: { animation: 'fade_from_bottom' },
  default: { animation: 'fade' },
});

function HomeTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.tab,
          borderTopColor: colors.border,
          minHeight: layout.tabBarMinHeight,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        tabBarItemStyle: { paddingVertical: spacing.xxs },
        tabBarLabelStyle: { fontFamily: typography.family.body, fontWeight: typography.weight.semibold, fontSize: typography.size.micro },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Chats: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Friends: focused ? 'people' : 'people-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={focused ? iconSize.lg : iconSize.md} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          title: 'Tin nhắn',
          tabBarLabel: 'Tin nhắn',
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          title: 'Bạn bè',
          tabBarLabel: 'Bạn bè',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarLabel: 'Cá nhân',
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenFadeOptions,
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenFadeOptions,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: typography.family.display, fontWeight: typography.weight.heavy, fontSize: typography.size.titleSmall, color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Tin nhắn',
          headerBackTitle: 'Quay lại',
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ title: 'Cài đặt nhóm' }} />
      <Stack.Screen name="GroupPermissions" component={GroupPermissionsScreen} options={{ title: 'Quyền trong nhóm' }} />
      <Stack.Screen name="PrivateConversationInfo" component={PrivateConversationInfoScreen} options={{ title: 'Thông tin trò chuyện' }} />
      <Stack.Screen name="SharedMedia" component={SharedMediaScreen} options={({ route }) => ({ title: route.params?.type === 'video' ? 'Video đã chia sẻ' : 'Ảnh đã chia sẻ' })} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'Tin nhắn mới', headerBackTitle: 'Quay lại', headerBackTitleVisible: false }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: 'Thông báo', headerBackTitle: 'Quay lại', headerBackTitleVisible: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Cài đặt thông báo', headerBackTitle: 'Quay lại', headerBackTitleVisible: false }} />
      <Stack.Screen name="AttachmentSettings" component={AttachmentSettingsScreen} options={{ title: 'Tệp đính kèm', headerBackTitle: 'Quay lại', headerBackTitleVisible: false }} />
      <Stack.Screen
        name="QrFriendScanner"
        component={QrFriendScannerScreen}
        options={{ title: 'Kết bạn bằng QR', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();
  const { colors } = useTheme();
  const pendingUidRef = useRef(null);
  const initialUrlHandledRef = useRef(false);

  useEffect(() => {
    const receiveUrl = (url) => {
      try {
        const { uid } = parseFriendQrPayload(url);
        if (token && navigationRef.isReady()) {
          navigationRef.navigate('QrFriendScanner', { uid });
        } else {
          pendingUidRef.current = uid;
        }
      } catch {
        // Links outside the strict Proxy friend contract are ignored.
      }
    };

    if (!initialUrlHandledRef.current) {
      initialUrlHandledRef.current = true;
      Linking.getInitialURL().then((url) => { if (url) receiveUrl(url); }).catch(() => {});
    }
    const subscription = Linking.addEventListener('url', ({ url }) => receiveUrl(url));
    return () => subscription.remove();
  }, [token]);

  const handleNavigationReady = () => {
    flushPendingNotificationIntent();
    if (!token || !pendingUidRef.current) return;
    const uid = pendingUidRef.current;
    pendingUidRef.current = null;
    navigationRef.navigate('QrFriendScanner', { uid });
  };

  useEffect(() => {
    if (!token || !pendingUidRef.current || !navigationRef.isReady()) return;
    const uid = pendingUidRef.current;
    pendingUidRef.current = null;
    navigationRef.navigate('QrFriendScanner', { uid });
  }, [token]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState count={7} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}
      theme={{
        dark: colors.mode === 'dark',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
