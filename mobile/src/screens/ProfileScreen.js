import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePasswordApi } from '../api/auth.api';
import BangbooMark from '../components/BangbooMark';
import Button from '../components/Button';
import Input from '../components/Input';
import KeyboardScreen from '../components/KeyboardScreen';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const set = (key) => (val) => setPwForm((form) => ({ ...form, [key]: val }));

  const validatePw = () => {
    const errors = {};
    if (!pwForm.current) errors.current = 'Nhập mật khẩu hiện tại.';
    if (pwForm.next.length < 6) errors.next = 'Mật khẩu mới cần ít nhất 6 ký tự.';
    if (pwForm.next !== pwForm.confirm) errors.confirm = 'Mật khẩu xác nhận không khớp.';
    setPwErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePw()) return;
    setPwLoading(true);
    try {
      await changePasswordApi({ currentPassword: pwForm.current, newPassword: pwForm.next });
      Alert.alert('Đã đổi mật khẩu', 'Mật khẩu mới có hiệu lực ngay.');
      setPwForm({ current: '', next: '', confirm: '' });
      setShowPwForm(false);
    } catch (err) {
      Alert.alert('Không thể đổi mật khẩu', err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <KeyboardScreen
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      extraBottomSpace={40}
    >
      <View style={[styles.hero, { borderBottomColor: colors.border }]}>
        <BangbooMark size={76} label="PROXY" />
        <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Người dùng'}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        <View style={[styles.statusPill, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {user?.is_online ? 'Đang hoạt động' : 'Sẵn sàng'}
          </Text>
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>TÙY CHỌN</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="contrast-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingCopy}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Giao diện</Text>
            <Text style={[styles.sectionNote, { color: colors.textMuted }]}>Chế độ sáng hoặc tối</Text>
          </View>
          <ThemeToggle />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPwForm((value) => !value)}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>Đổi mật khẩu</Text>
          <Ionicons name={showPwForm ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {showPwForm && (
          <View style={styles.pwForm}>
            <Input label="Mật khẩu hiện tại" value={pwForm.current} onChangeText={set('current')} secureTextEntry error={pwErrors.current} />
            <Input label="Mật khẩu mới" value={pwForm.next} onChangeText={set('next')} secureTextEntry error={pwErrors.next} />
            <Input label="Xác nhận mật khẩu mới" value={pwForm.confirm} onChangeText={set('confirm')} secureTextEntry error={pwErrors.confirm} />
            <Button title="Lưu mật khẩu" icon="checkmark" onPress={handleChangePassword} loading={pwLoading} />
          </View>
        )}
      </View>

      <Button title="Đăng xuất" icon="log-out-outline" onPress={handleLogout} variant="danger" style={styles.logoutBtn} />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 28 },
  hero: {
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  name: { fontSize: 23, fontWeight: '900', marginTop: 14 },
  email: { fontSize: 14, marginTop: 4 },
  statusPill: { marginTop: 12, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '900' },
  groupLabel: { fontSize: 11, fontWeight: '800', marginBottom: 7, marginLeft: 2 },
  section: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, marginLeft: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionNote: { fontSize: 13, marginTop: 3 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '800', marginLeft: 11 },
  pwForm: { paddingHorizontal: 16, paddingBottom: 16 },
  logoutBtn: { marginTop: 4 },
});
