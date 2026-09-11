import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, touchTarget } from '../theme/tokens';

export default function AttachmentButton({ onPress, disabled = false }) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surfaceAlt },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Đính kèm ảnh hoặc video"
      accessibilityState={{ disabled }}
    >
      <Ionicons name="add" size={iconSize.lg} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
