import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, spacing, typography } from '../theme/tokens';

export default function PermissionSwitchRow({ label, icon, value, onChange, disabled, child = false, description }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)} disabled={disabled}
      accessibilityRole="switch" accessibilityLabel={label}
      accessibilityHint={description} accessibilityState={{ checked: !!value, disabled: !!disabled }}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider, backgroundColor: pressed ? colors.surfacePressed : colors.surface }, child && styles.child]}
    >
      <Ionicons name={icon} size={iconSize.md} color={disabled ? colors.textSubtle : colors.textMuted} />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: disabled ? colors.textMuted : colors.text }]}>{label}</Text>
        {description ? <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text> : null}
      </View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch value={!!value} disabled={disabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth },
  child: { paddingLeft: spacing.huge },
  copy: { flex: 1, paddingHorizontal: spacing.lg },
  label: { fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input },
  description: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginTop: spacing.xs },
});
