import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BangbooMark from '../components/BangbooMark';
import Button from '../components/Button';
import Input from '../components/Input';
import KeyboardScreen from '../components/KeyboardScreen';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Nhập họ tên.';
    if (!form.email) next.email = 'Nhập email.';
    if (form.password.length < 6) next.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (form.password !== form.confirm) next.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      Alert.alert('Không thể đăng ký', `${err.message}\n\nKiểm tra thông tin hoặc kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <BangbooMark size={68} label="NEW PROXY" />
          <Text style={[styles.title, { color: colors.text }]}>Tạo tài khoản</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Thiết lập hồ sơ để bắt đầu nhắn tin.</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input label="Họ tên" value={form.name} onChangeText={set('name')} placeholder="Nguyễn Văn A" error={errors.name} autoCapitalize="words" />
          <Input label="Email" value={form.email} onChangeText={set('email')} placeholder="example@email.com" keyboardType="email-address" error={errors.email} />
          <Input label="Mật khẩu" value={form.password} onChangeText={set('password')} placeholder="Ít nhất 6 ký tự" secureTextEntry error={errors.password} />
          <Input label="Xác nhận mật khẩu" value={form.confirm} onChangeText={set('confirm')} placeholder="Nhập lại mật khẩu" secureTextEntry error={errors.confirm} returnKeyType="done" onSubmitEditing={handleRegister} />
          <Button title="Đăng ký" icon="person-add-outline" onPress={handleRegister} loading={loading} style={styles.btn} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: colors.textMuted }]}>
            Đã có tài khoản? <Text style={{ color: colors.primary, fontWeight: '900' }}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  panel: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 4 },
  btn: { marginTop: 8 },
  link: { textAlign: 'center', fontSize: 14, marginTop: 18 },
});
