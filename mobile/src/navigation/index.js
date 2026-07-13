import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../store/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import FriendsScreen from '../screens/FriendsScreen';
import { useTheme } from '../store/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tab,
          borderTopColor: colors.border,
          minHeight: 62,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Chats: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Friends: focused ? 'people' : 'people-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={23} color={color} />;
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Tin nhắn', headerBackTitle: 'Quay lại' }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'Tin nhắn mới', headerBackTitle: 'Quay lại' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
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
