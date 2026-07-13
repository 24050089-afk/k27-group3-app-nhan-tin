import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

export default function Button({ title, onPress, loading, disabled = false, variant = 'primary', icon, style }) {
  const { colors } = useTheme();
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const inactive = loading || disabled;
  const foreground = isOutline ? colors.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isOutline
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary }
          : { backgroundColor: isDanger ? colors.danger : colors.primary },
        inactive && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={foreground} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: foreground }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  icon: { marginRight: 8 },
});
