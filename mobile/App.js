import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { DeviceProvider } from './src/store/DeviceContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import AppNavigator from './src/navigation';
import DebugOverlay from './src/components/DebugOverlay';

function AppShell() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <DebugOverlay />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeviceProvider>
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </DeviceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
