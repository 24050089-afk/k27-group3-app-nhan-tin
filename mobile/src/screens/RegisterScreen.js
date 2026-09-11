import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import Input from '../components/Input';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { spacing, touchTarget, typography } from '../theme/tokens';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Nhập họ tên.';
    if (!form.email.trim()) next.email = 'Nhập email.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Email chưa đúng định dạng.';
    if (form.password.length < 6) next.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (form.password !== form.confirm) next.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compact
      title="Tạo tài khoản"
      description="Dùng tên thật hoặc tên bạn bè dễ nhận ra trong cuộc trò chuyện."
      footer={(
        <Pressable style={styles.footerLink} onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập">
          <Text style={[styles.link, { color: colors.textMuted }]}>Đã có tài khoản? <Text style={{ color: colors.primary, fontWeight: typography.weight.bold }}>Đăng nhập</Text></Text>
        </Pressable>
      )}
    >
      {serverError ? <ErrorState compact title="Không thể tạo tài khoản" message={serverError} /> : null}
      <Input icon="person-outline" label="Họ tên" value={form.name} onChangeText={set('name')} placeholder="Tên hiển thị của bạn" error={errors.name} autoCapitalize="words" textContentType="name" autoComplete="name" />
      <Input icon="mail-outline" label="Email" value={form.email} onChangeText={set('email')} placeholder="ban@example.com" keyboardType="email-address" error={errors.email} textContentType="emailAddress" autoComplete="email" />
      <Input icon="lock-closed-outline" label="Mật khẩu" value={form.password} onChangeText={set('password')} placeholder="Ít nhất 6 ký tự" secureTextEntry error={errors.password} textContentType="newPassword" autoComplete="new-password" />
      <Input icon="checkmark-circle-outline" label="Xác nhận mật khẩu" value={form.confirm} onChangeText={set('confirm')} placeholder="Nhập lại mật khẩu" secureTextEntry error={errors.confirm} returnKeyType="done" onSubmitEditing={handleRegister} textContentType="newPassword" autoComplete="new-password" />
      <Button title="Tạo tài khoản" icon="arrow-forward" onPress={handleRegister} loading={loading} style={styles.button} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.xs },
  footerLink: { minHeight: touchTarget.compact, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, textAlign: 'center' },
});
