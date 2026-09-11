import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, layout, radius, spacing, touchTarget, typography } from '../theme/tokens';

export function HeaderAction({ icon, label, onPress, primary = false, disabled = false }) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: primary ? colors.text : colors.surfaceAlt },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={iconSize.md} color={primary ? colors.background : colors.text} />
    </Pressable>
  );
}

export default function AppHeader({
  title,
  subtitle,
  user,
  avatarSize = 46,
  actions = [],
  children,
  showAvatar = true,
}) {
  const { layout: deviceLayout } = useDevice();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: deviceLayout.safeTop + spacing.md,
          backgroundColor: colors.background,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.identity}>
          {showAvatar ? <Avatar user={user} size={avatarSize} showStatus /> : null}
          <View style={[styles.copy, !showAvatar && styles.copyWithoutAvatar]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
        {actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map((action) => <HeaderAction key={action.label} {...action} />)}
          </View>
        ) : null}
      </View>
      {children ? <View style={styles.accessory}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    minHeight: layout.headerContentHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, marginLeft: spacing.md },
  copyWithoutAvatar: { marginLeft: spacing.none },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    fontWeight: typography.weight.heavy,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: typography.family.body,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xxs,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.md },
  action: {
    width: touchTarget.compact,
    height: touchTarget.compact,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessory: { marginTop: spacing.md },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
