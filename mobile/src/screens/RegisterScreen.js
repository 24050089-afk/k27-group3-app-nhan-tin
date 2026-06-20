import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên.';
    if (!form.email) e.email = 'Vui lòng nhập email.';
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự.';
    if (form.password !== form.confirm) e.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      Alert.alert('Đăng ký thất bại', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Điền thông tin để đăng ký</Text>

        <Input label="Họ tên" value={form.name} onChangeText={set('name')} placeholder="Nguyễn Văn A" error={errors.name} autoCapitalize="words" />
        <Input label="Email" value={form.email} onChangeText={set('email')} placeholder="example@email.com" keyboardType="email-address" error={errors.email} />
        <Input label="Mật khẩu" value={form.password} onChangeText={set('password')} placeholder="••••••••" secureTextEntry error={errors.password} />
        <Input label="Xác nhận mật khẩu" value={form.confirm} onChangeText={set('confirm')} placeholder="••••••••" secureTextEntry error={errors.confirm} />

        <Button title="Đăng ký" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Đã có tài khoản? <Text style={styles.linkBold}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  btn: { marginTop: 8, marginBottom: 20 },
  link: { textAlign: 'center', color: '#6B7280', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '600' },
});
