import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';

export default function Avatar({ user, size = 44 }) {
  const { colors } = useTheme();
  const name = user?.name || user?.username || '?';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={[styles.avatar, { backgroundColor: colors.surfaceAlt }, style]} />;
  }

  return (
    <View style={[styles.avatar, styles.fallback, { backgroundColor: colors.primary }, style]}>
      <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {},
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontWeight: '700' },
});
