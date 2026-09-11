import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function UserListItem({
  user,
  subtitle,
  actionTitle,
  actionIcon,
  onAction,
  actionDisabled = false,
  onPress,
  loading = false,
  selected = false,
  first = false,
  last = false,
}) {
  const { colors } = useTheme();
  const displayName = user?.name || user?.username || 'Người dùng';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: selected ? colors.primarySoft : pressed && onPress ? colors.surfacePressed : colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopLeftRadius: first ? radius.lg : 0,
          borderTopRightRadius: first ? radius.lg : 0,
          borderBottomLeftRadius: last ? radius.lg : 0,
          borderBottomRightRadius: last ? radius.lg : 0,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Mở cuộc trò chuyện với ${displayName}` : undefined}
    >
      <Avatar user={user} size={48} showStatus />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle || user?.username || user?.email || user?.phone || 'Chưa có thông tin liên hệ'}
        </Text>
      </View>
      {actionTitle && (onAction || actionDisabled) ? (
        <Pressable
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: selected ? colors.surface : colors.text },
            pressed && styles.pressed,
            (loading || actionDisabled) && styles.disabled,
          ]}
          onPress={onAction}
          disabled={loading || actionDisabled}
          accessibilityRole="button"
          accessibilityLabel={`${actionTitle} ${displayName}`}
          accessibilityState={{ disabled: loading || actionDisabled, busy: loading }}
        >
          <Ionicons
            name={loading ? 'hourglass-outline' : actionIcon || 'arrow-forward'}
            size={iconSize.sm}
            color={selected ? colors.text : colors.background}
          />
          <Text style={[styles.actionText, { color: selected ? colors.text : colors.background }]}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  name: { fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  subtitle: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.xxs },
  action: {
    minHeight: touchTarget.compact,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
