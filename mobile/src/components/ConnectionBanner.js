import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, spacing, typography } from '../theme/tokens';

export default function ConnectionBanner({ connected }) {
  const { colors } = useTheme();
  if (connected) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.warningSoft }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={iconSize.sm} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>Đang ngoại tuyến. Tin mới sẽ cập nhật khi có kết nối.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  text: { flexShrink: 1, fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, fontWeight: typography.weight.semibold, marginLeft: spacing.sm },
});
