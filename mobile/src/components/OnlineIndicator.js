import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing } from '../theme/tokens';

export default function OnlineIndicator({ online, size = 12, bordered = true }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: online ? colors.success : colors.textSubtle,
          borderColor: colors.surface,
          borderWidth: bordered ? spacing.xxs : 0,
        },
      ]}
      accessibilityLabel={online ? 'Đang hoạt động' : 'Ngoại tuyến'}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderRadius: radius.round,
  },
});
