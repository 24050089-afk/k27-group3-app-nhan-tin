import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { componentState, elevation, motion, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function ToastMessage({ message, actionLabel, onAction, onDismiss, duration = 3200 }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: motion.fast, useNativeDriver: true }).start(onDismiss);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, message, onDismiss, progress]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        elevation.floating,
        {
          bottom: Math.max(insets.bottom, spacing.md) + 78,
          backgroundColor: colors.text,
          shadowColor: colors.shadow,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.message, { color: colors.background }]} numberOfLines={3}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.action, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: colors.text }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', zIndex: 30, left: spacing.lg, right: spacing.lg, minHeight: touchTarget.default, borderRadius: radius.lg, paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, fontWeight: typography.weight.semibold },
  action: { minHeight: touchTarget.compact, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  actionText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});

