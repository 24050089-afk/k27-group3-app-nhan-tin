import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import Input from '../components/Input';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { spacing, touchTarget, typography } from '../theme/tokens';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ email: '', password: '' });
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
    if (!form.email.trim()) next.email = 'Nhập email để đăng nhập.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Email chưa đúng định dạng.';
    if (!form.password) next.password = 'Nhập mật khẩu để tiếp tục.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chào bạn trở lại"
      description="Đăng nhập để tiếp tục từ đúng cuộc trò chuyện bạn đang theo dõi."
      footer={(
        <Pressable style={styles.footerLink} onPress={() => navigation.navigate('Register')} accessibilityRole="button" accessibilityLabel="Mở màn hình đăng ký">
          <Text style={[styles.link, { color: colors.textMuted }]}>Chưa có tài khoản? <Text style={{ color: colors.primary, fontWeight: typography.weight.bold }}>Tạo tài khoản</Text></Text>
        </Pressable>
      )}
    >
      {serverError ? <ErrorState compact title="Không thể đăng nhập" message={serverError} /> : null}
      <Input icon="mail-outline" label="Email" value={form.email} onChangeText={set('email')} placeholder="ban@example.com" keyboardType="email-address" error={errors.email} textContentType="emailAddress" autoComplete="email" />
      <Input icon="lock-closed-outline" label="Mật khẩu" value={form.password} onChangeText={set('password')} placeholder="Nhập mật khẩu" secureTextEntry error={errors.password} returnKeyType="done" onSubmitEditing={handleLogin} textContentType="password" autoComplete="current-password" />
      <Pressable style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="button">
        <Text style={[styles.forgotText, { color: colors.primary }]}>Quên mật khẩu?</Text>
      </Pressable>
      <Button title="Đăng nhập" icon="arrow-forward" onPress={handleLogin} loading={loading} style={styles.button} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: 'flex-end', minHeight: touchTarget.compact, justifyContent: 'center', marginTop: -spacing.sm },
  forgotText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  button: { marginTop: spacing.sm },
  footerLink: { minHeight: touchTarget.compact, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, textAlign: 'center' },
});
