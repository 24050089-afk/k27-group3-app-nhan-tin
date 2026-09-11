import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function Button({ title, onPress, loading, disabled = false, variant = 'primary', icon, style, compact = false }) {
  const { colors } = useTheme();
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const inactive = loading || disabled;
  const foreground = isDanger ? colors.onDanger : isOutline || isGhost ? colors.primary : colors.onPrimary;
  const background = isGhost || isOutline ? 'transparent' : isDanger ? colors.danger : colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: background, borderWidth: isOutline ? 1 : 0, borderColor: colors.border },
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconSize.sm} color={foreground} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: foreground }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.comfortable,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  text: {
    fontFamily: typography.family.body,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.1,
  },
  icon: { marginRight: spacing.sm },
  compact: { minHeight: touchTarget.compact, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  inactive: { opacity: componentState.disabledOpacity },
});
