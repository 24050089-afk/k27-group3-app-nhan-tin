import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DeviceContext = createContext(null);

// ─── DeviceProvider ────────────────────────────────────────────────────────────
// Đặt bên trong <SafeAreaProvider> (đã có trong App.js)
// Cung cấp: insets, device profile, layout presets
//
// Thiết bị được nhận dạng theo chiều rộng màn hình:
//   SMALL   < 375  : iPhone SE, Android nhỏ
//   MEDIUM  375–413: iPhone 14/15/16, Android mid
//   LARGE   414–429: iPhone 14 Plus/15 Plus, Pixel 8 Pro
//   XLARGE  ≥ 430  : iPhone 16 Pro Max/17 Pro Max, Galaxy Ultra

export function DeviceProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState(Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreen(window));
    return () => sub?.remove();
  }, []);

  const W = screen.width;
  const H = screen.height;

  const device = {
    width: W,
    height: H,

    // Nhóm thiết bị
    isSmall: W < 375,
    isMedium: W >= 375 && W < 414,
    isLarge: W >= 414 && W < 430,
    isXLarge: W >= 430,

    // Tính năng màn hình
    hasNotch: insets.top >= 44,          // Notch hoặc Dynamic Island
    hasHomeIndicator: insets.bottom > 0, // Không có nút Home vật lý
  };

  // Layout presets tính sẵn — dùng trực tiếp trong StyleSheet
  const layout = {
    // Chiều cao vùng không hiển thị
    statusBarH: insets.top,
    homeIndicatorH: insets.bottom,

    // Khoảng đệm an toàn cho content
    safeTop: insets.top,
    safeBottom: insets.bottom,

    // Header tự quản lý (khi headerShown: false)
    customHeaderH: insets.top + 52,

    // Tab bar tự quản lý (khi tabBarStyle custom)
    customTabBarH: insets.bottom + 49,

    // Padding mặc định cho ScrollView / FlatList
    contentPaddingBottom: insets.bottom + 16,

    // Padding ngang theo nhóm thiết bị
    screenPaddingH: device.isSmall ? 12 : device.isXLarge ? 24 : 16,
  };

  return (
    <DeviceContext.Provider value={{ insets, device, layout }}>
      {children}
    </DeviceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice phải dùng bên trong <DeviceProvider>');
  return ctx;
}
