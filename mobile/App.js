import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { DeviceProvider } from './src/store/DeviceContext';
import AppNavigator from './src/navigation';
import DebugOverlay from './src/components/DebugOverlay';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeviceProvider>
          <StatusBar style="dark" />
          <AppNavigator />
          <DebugOverlay />
        </DeviceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
