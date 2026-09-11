import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { forgotPasswordApi } from '../api/auth.api';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import Input from '../components/Input';
import { useTheme } from '../store/ThemeContext';
import { spacing, touchTarget, typography } from '../theme/tokens';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Nhập email của tài khoản.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Email chưa đúng định dạng.';
    if (form.newPassword.length < 6) next.newPassword = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Mật khẩu xác nhận không khớp.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const res = await forgotPasswordApi({
        email: form.email.trim(),
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      Alert.alert('Đã đổi mật khẩu', res.message || 'Bạn có thể đăng nhập bằng mật khẩu mới.', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compact
      title="Đặt lại mật khẩu"
      description="Xác nhận email và chọn mật khẩu mới cho tài khoản của bạn."
      footer={(
        <Pressable style={styles.footerLink} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>Quay lại đăng nhập</Text>
        </Pressable>
      )}
    >
      {serverError ? <ErrorState compact title="Không thể đổi mật khẩu" message={serverError} /> : null}
      <Input icon="mail-outline" label="Email" value={form.email} onChangeText={set('email')} placeholder="ban@example.com" keyboardType="email-address" error={errors.email} textContentType="emailAddress" autoComplete="email" />
      <Input icon="lock-closed-outline" label="Mật khẩu mới" value={form.newPassword} onChangeText={set('newPassword')} placeholder="Ít nhất 6 ký tự" secureTextEntry error={errors.newPassword} textContentType="newPassword" autoComplete="new-password" />
      <Input icon="checkmark-circle-outline" label="Xác nhận mật khẩu mới" value={form.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Nhập lại mật khẩu" secureTextEntry error={errors.confirmPassword} returnKeyType="done" onSubmitEditing={handleSubmit} textContentType="newPassword" autoComplete="new-password" />
      <Button title="Lưu mật khẩu mới" icon="arrow-forward" onPress={handleSubmit} loading={loading} style={styles.button} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.xs },
  footerLink: { minHeight: touchTarget.compact, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold, textAlign: 'center' },
});
