import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  keyboardType,
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  textContentType,
  autoComplete,
  icon,
  ...textInputProps
}) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: focused ? colors.surface : colors.surfaceAlt,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={iconSize.sm} color={focused ? colors.primary : colors.textMuted} style={styles.leadingIcon} /> : null}
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textContentType={textContentType}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          {...textInputProps}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={iconSize.md} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold, marginBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.comfortable,
  },
  input: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input, paddingVertical: spacing.md },
  leadingIcon: { marginRight: spacing.sm },
  eyeBtn: { width: touchTarget.compact, height: touchTarget.compact, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  error: { fontFamily: typography.family.body, fontSize: typography.size.caption, marginTop: spacing.xs, lineHeight: typography.lineHeight.caption },
});
