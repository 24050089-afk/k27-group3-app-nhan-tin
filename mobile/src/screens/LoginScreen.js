import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BangbooMark from '../components/BangbooMark';
import Button from '../components/Button';
import Input from '../components/Input';
import KeyboardScreen from '../components/KeyboardScreen';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.email) next.email = 'Nhập email để đăng nhập.';
    if (!form.password) next.password = 'Nhập mật khẩu để tiếp tục.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      Alert.alert('Không thể đăng nhập', `${err.message}\n\nKiểm tra thông tin hoặc kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <BangbooMark size={76} label="BANGBOO NET" />
          <Text style={[styles.title, { color: colors.text }]}>Đăng nhập</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Tiếp tục các cuộc trò chuyện của bạn.</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input label="Email" value={form.email} onChangeText={set('email')} placeholder="example@email.com" keyboardType="email-address" error={errors.email} />
          <Input label="Mật khẩu" value={form.password} onChangeText={set('password')} placeholder="Nhập mật khẩu" secureTextEntry error={errors.password} returnKeyType="done" onSubmitEditing={handleLogin} />
          <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          <Button title="Đăng nhập" icon="log-in-outline" onPress={handleLogin} loading={loading} style={styles.btn} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.link, { color: colors.textMuted }]}>
            Chưa có tài khoản? <Text style={{ color: colors.primary, fontWeight: '900' }}>Đăng ký</Text>
          </Text>
        </TouchableOpacity>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 28, fontWeight: '900', marginTop: 18, textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  panel: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 4 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12 },
  forgotText: { fontSize: 13, fontWeight: '900' },
  btn: { marginTop: 8 },
  link: { textAlign: 'center', fontSize: 14, marginTop: 18 },
});
