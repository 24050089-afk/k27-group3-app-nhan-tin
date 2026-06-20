import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { changePasswordApi } from '../api/auth.api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const set = (key) => (val) => setPwForm((f) => ({ ...f, [key]: val }));

  const validatePw = () => {
    const e = {};
    if (!pwForm.current) e.current = 'Nhập mật khẩu hiện tại.';
    if (pwForm.new.length < 6) e.new = 'Mật khẩu mới tối thiểu 6 ký tự.';
    if (pwForm.new !== pwForm.confirm) e.confirm = 'Mật khẩu xác nhận không khớp.';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePw()) return;
    setPwLoading(true);
    try {
      await changePasswordApi({ currentPassword: pwForm.current, newPassword: pwForm.new });
      Alert.alert('Thành công', 'Đổi mật khẩu thành công.');
      setPwForm({ current: '', new: '', confirm: '' });
      setShowPwForm(false);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
      </View>

      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowPwForm((v) => !v)}
        >
          <Text style={styles.menuText}>🔑  Đổi mật khẩu</Text>
          <Text style={styles.menuArrow}>{showPwForm ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showPwForm && (
          <View style={styles.pwForm}>
            <Input label="Mật khẩu hiện tại" value={pwForm.current} onChangeText={set('current')} secureTextEntry error={pwErrors.current} />
            <Input label="Mật khẩu mới" value={pwForm.new} onChangeText={set('new')} secureTextEntry error={pwErrors.new} />
            <Input label="Xác nhận mật khẩu mới" value={pwForm.confirm} onChangeText={set('confirm')} secureTextEntry error={pwErrors.confirm} />
            <Button title="Xác nhận đổi mật khẩu" onPress={handleChangePassword} loading={pwLoading} />
          </View>
        )}
      </View>

      <Button
        title="Đăng xuất"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { alignItems: 'center', padding: 24, paddingTop: 40 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 28,
  },
  roleText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  section: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuText: { fontSize: 15, color: '#111827' },
  menuArrow: { color: '#9CA3AF' },
  pwForm: { paddingHorizontal: 16, paddingBottom: 16 },
  logoutBtn: { width: '100%', marginTop: 8 },
});
