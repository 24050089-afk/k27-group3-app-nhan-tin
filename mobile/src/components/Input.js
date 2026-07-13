import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

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
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
      >
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 12, marginTop: 5, lineHeight: 17 },
});
