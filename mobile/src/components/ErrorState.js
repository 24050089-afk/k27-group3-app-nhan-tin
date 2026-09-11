import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function ErrorState({ title = 'Không tải được dữ liệu', message, onRetry, compact = false }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="alert">
      <View style={[styles.iconWrap, compact && styles.compactIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={compact ? iconSize.sm : iconSize.lg} color={colors.danger} />
      </View>
      <View style={[styles.copy, compact && styles.compactCopy]}>
        <Text style={[styles.title, compact && styles.compactTitle, { color: colors.text }]}>{title}</Text>
        {message ? <Text style={[styles.message, compact && styles.compactMessage, { color: colors.textMuted }]}>{message}</Text> : null}
      </View>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [styles.retry, compact && styles.compactRetry, { borderColor: colors.border }, pressed && styles.pressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Thử lại"
        >
          <Ionicons name="refresh" size={iconSize.sm} color={colors.text} />
          <Text style={[styles.retryText, { color: colors.text }]}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  compact: { flexDirection: 'row', justifyContent: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.none },
  iconWrap: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  compactIcon: { width: 36, height: 36, borderRadius: radius.md },
  copy: { alignItems: 'center', marginTop: spacing.md },
  compactCopy: { flex: 1, alignItems: 'flex-start', marginTop: spacing.none, marginLeft: spacing.md },
  title: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, fontWeight: typography.weight.bold, textAlign: 'center' },
  compactTitle: { fontSize: typography.size.bodySmall, textAlign: 'left' },
  message: { maxWidth: 320, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, textAlign: 'center', marginTop: spacing.xs },
  compactMessage: { fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, textAlign: 'left', marginTop: spacing.xxs },
  retry: { minHeight: touchTarget.compact, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  compactRetry: { marginTop: spacing.none, marginLeft: spacing.sm },
  retryText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
