import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm',
  onSubmit,
  autoFocus = false,
  accessibilityLabel = 'Tìm kiếm',
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: focused ? colors.surfaceRaised : colors.surfaceAlt,
          borderColor: focused ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons name="search" size={iconSize.sm} color={focused ? colors.primary : colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
      />
      {value ? (
        <Pressable
          style={styles.clear}
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Xóa nội dung tìm kiếm"
          hitSlop={spacing.sm}
        >
          <Ionicons name="close-circle" size={iconSize.sm} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: touchTarget.default,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: touchTarget.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontFamily: typography.family.body,
    fontSize: typography.size.body,
  },
  clear: { width: touchTarget.compact, height: touchTarget.compact, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.md },
});
