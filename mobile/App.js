import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { DeviceProvider } from './src/store/DeviceContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { NotificationProvider } from './src/store/NotificationContext';
import AppNavigator from './src/navigation';
import DebugOverlay from './src/components/DebugOverlay';

function AppShell() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <DebugOverlay />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeviceProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AppShell />
            </NotificationProvider>
          </ThemeProvider>
        </DeviceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
