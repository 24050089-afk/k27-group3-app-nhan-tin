import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function SettingsRow({
  icon,
  label,
  description,
  value,
  onPress,
  danger = false,
  trailing,
  first = false,
  last = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  valueTextStyle,
  valueNumberOfLines = 1,
}) {
  const { colors } = useTheme();
  const foreground = danger ? colors.danger : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed && onPress ? colors.surfacePressed : colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopLeftRadius: first ? radius.lg : 0,
          borderTopRightRadius: first ? radius.lg : 0,
          borderBottomLeftRadius: last ? radius.lg : 0,
          borderBottomRightRadius: last ? radius.lg : 0,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : undefined)}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
    >
      <View style={[styles.iconWrap, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceAlt }]}>
        <Ionicons name={icon} size={iconSize.sm} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        {description ? <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>{description}</Text> : null}
      </View>
      {value ? <Text style={[styles.value, { color: colors.textMuted }, valueTextStyle]} numberOfLines={valueNumberOfLines}>{value}</Text> : null}
      {trailing || (onPress ? <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginHorizontal: spacing.md },
  label: { fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  description: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginTop: spacing.xxs },
  value: { maxWidth: 120, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, marginRight: spacing.sm },
  disabled: { opacity: componentState.disabledOpacity },
});
