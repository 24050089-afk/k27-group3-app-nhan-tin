import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        compact && styles.compact,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Giao diện tối"
    >
      <Ionicons name={isDark ? 'moon' : 'sunny'} size={compact ? 17 : 18} color={isDark ? colors.primary : colors.accent} />
      {!compact ? <Text style={[styles.label, { color: colors.text }]}>{isDark ? 'Tối' : 'Sáng'}</Text> : null}
      <View style={[styles.track, { backgroundColor: isDark ? colors.primary : colors.border }]}>
        <View style={[styles.knob, isDark && styles.knobDark, { backgroundColor: colors.surface }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    height: 38,
    minWidth: 112,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compact: { minWidth: 76, height: 40, justifyContent: 'space-between' },
  track: { width: 34, height: 20, borderRadius: 10, padding: 2, marginLeft: 'auto' },
  knob: { width: 16, height: 16, borderRadius: 8 },
  knobDark: { marginLeft: 14 },
  label: { fontSize: 13, fontWeight: '700', marginLeft: 7 },
});
