import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function EmptyState({ icon = 'chatbubble-ellipses-outline', title, description, actionLabel, onAction, compact = false }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={iconSize.lg} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.action, { backgroundColor: colors.text }, pressed && styles.pressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: colors.background }]}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={iconSize.sm} color={colors.background} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: spacing.huge },
  compact: { paddingVertical: spacing.xxl },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, lineHeight: typography.lineHeight.titleSmall, fontWeight: typography.weight.bold, textAlign: 'center', marginTop: spacing.lg },
  description: { maxWidth: 300, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, textAlign: 'center', marginTop: spacing.sm },
  action: { minHeight: touchTarget.default, borderRadius: radius.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  actionText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
