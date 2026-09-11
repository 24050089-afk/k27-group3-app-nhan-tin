import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, spacing, touchTarget, typography } from '../theme/tokens';

export default function SectionHeader({ title, description, actionLabel, onAction }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={iconSize.xs} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  copy: { flex: 1 },
  title: { fontFamily: typography.family.display, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  description: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginTop: spacing.xxs },
  action: { minHeight: touchTarget.compact, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md },
  actionText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
});
