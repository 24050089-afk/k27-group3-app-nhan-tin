import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, motion, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function ThemeToggle({ compact = false }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: isDark ? 1 : 0, duration: motion.normal, useNativeDriver: true }).start();
  }, [isDark, progress]);

  return (
    <Pressable
      style={[
        styles.toggle,
        compact && styles.compact,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
      onPress={toggleTheme}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={`Chuyển sang giao diện ${isDark ? 'sáng' : 'tối'}`}
    >
      <Ionicons name="contrast-outline" size={iconSize.sm} color={colors.primary} />
      {!compact ? <Text style={[styles.label, { color: colors.text }]}>{isDark ? 'Giao diện tối' : 'Giao diện sáng'}</Text> : null}
      <View style={[styles.track, { backgroundColor: isDark ? colors.primary : colors.border }]}>
        <Animated.View style={[styles.knob, { backgroundColor: colors.surfaceRaised, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: touchTarget.compact,
    minWidth: 154,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compact: { minWidth: 70, minHeight: touchTarget.compact, justifyContent: 'space-between' },
  track: { width: 34, height: 20, borderRadius: radius.round, padding: spacing.xxs, marginLeft: 'auto' },
  knob: { width: 16, height: 16, borderRadius: radius.round },
  label: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold, marginLeft: spacing.sm },
});
