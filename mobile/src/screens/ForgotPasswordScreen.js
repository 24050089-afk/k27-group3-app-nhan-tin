import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { forgotPasswordApi } from '../api/auth.api';
import BangbooMark from '../components/BangbooMark';
import Button from '../components/Button';
import Input from '../components/Input';
import KeyboardScreen from '../components/KeyboardScreen';
import { useTheme } from '../store/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Nhập email của tài khoản.';
    if (form.newPassword.length < 6) next.newPassword = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Mật khẩu xác nhận không khớp.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setLoading(true);
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
      Alert.alert('Không thể đổi mật khẩu', `${err.message}\n\nKiểm tra email hoặc kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <BangbooMark size={68} label="RECOVERY" />
          <Text style={[styles.title, { color: colors.text }]}>Đặt lại mật khẩu</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Xác nhận email và chọn mật khẩu mới.</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            placeholder="example@email.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Mật khẩu mới"
            value={form.newPassword}
            onChangeText={set('newPassword')}
            placeholder="Ít nhất 6 ký tự"
            secureTextEntry
            error={errors.newPassword}
          />
          <Input
            label="Xác nhận mật khẩu mới"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
            error={errors.confirmPassword}
          />
          <Button title="Đổi mật khẩu" icon="key-outline" onPress={handleSubmit} loading={loading} style={styles.btn} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: colors.primary }]}>Quay lại đăng nhập</Text>
        </TouchableOpacity>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 28, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  panel: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 4 },
  btn: { marginTop: 8 },
  link: { textAlign: 'center', fontSize: 14, fontWeight: '900', marginTop: 18 },
});
