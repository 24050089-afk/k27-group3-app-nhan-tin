import React, { useCallback, useRef, useState } from 'react';
import { Alert, LayoutAnimation, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { changePasswordApi } from '../api/auth.api';
import { updateMyProfileApi } from '../api/user.api';
import AppHeader from '../components/AppHeader';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import ConfirmationDialog from '../components/ConfirmationDialog';
import EditUsernameSheet from '../components/EditUsernameSheet';
import ErrorState from '../components/ErrorState';
import Input from '../components/Input';
import KeyboardScreen from '../components/KeyboardScreen';
import MyQrSheet from '../components/MyQrSheet';
import SectionHeader from '../components/SectionHeader';
import SettingsRow from '../components/SettingsRow';
import ThemeToggle from '../components/ThemeToggle';
import ToastMessage from '../components/ToastMessage';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { getUidAccessibilityLabel, isValidPublicUid, normalizePublicUid } from '../utils/friendQrPayload';
import { layout, radius, spacing, typography } from '../theme/tokens';

function SettingsSection({ children }) {
  return <View style={styles.section}>{children}</View>;
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showUsernameSheet, setShowUsernameSheet] = useState(false);
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [toast, setToast] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);
  const activityFlight = useRef(false);
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const uid = normalizePublicUid(user?.uid);
  const hasValidUid = isValidPublicUid(uid);

  const dismissToast = useCallback(() => setToast(''), []);
  const showToast = useCallback((message) => setToast(message), []);

  useFocusEffect(useCallback(() => {
    let active = true;
    refreshUser().catch(() => {
      if (active && !user?.uid) setToast('Không thể đồng bộ UID. Hãy kiểm tra kết nối rồi thử lại.');
    });
    return () => { active = false; };
  }, [user?.id]));

  const set = (key) => (value) => {
    setPwForm((form) => ({ ...form, [key]: value }));
    setPwErrors((errors) => ({ ...errors, [key]: undefined }));
    setPwError('');
  };

  const togglePasswordForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowPwForm((value) => !value);
    setPwError('');
  };

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
    setPwError('');
    try {
      await changePasswordApi({ currentPassword: pwForm.current, newPassword: pwForm.next });
      Alert.alert('Đã đổi mật khẩu', 'Mật khẩu mới có hiệu lực ngay.');
      setPwForm({ current: '', next: '', confirm: '' });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleUsernameSaved = async (updatedUser) => {
    const committed = await updateUser({ id: updatedUser?.id, username: updatedUser?.username ?? null });
    if (!committed) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
    showToast(updatedUser.username ? 'Đã cập nhật tên người dùng.' : 'Đã xóa tên người dùng.');
  };

  const handleCopyUid = async () => {
    if (!hasValidUid) {
      showToast('UID chưa sẵn sàng.');
      return;
    }
    try {
      await Clipboard.setStringAsync(uid);
      showToast('Đã sao chép UID.');
    } catch {
      showToast('Không thể sao chép UID lúc này.');
    }
  };

  const activityEnabled = user?.show_activity_status !== false;
  const toggleActivityStatus = async () => {
    if (activityFlight.current) return;
    activityFlight.current = true;
    setActivitySaving(true);
    try {
      const response = await updateMyProfileApi({ show_activity_status: !activityEnabled });
      const updatedUser = response?.data?.user ?? response?.data ?? response?.user;
      const activityPatch = updatedUser && {
        id: updatedUser.id,
        show_activity_status: updatedUser.show_activity_status,
        is_online: updatedUser.is_online,
        last_seen_at: updatedUser.last_seen_at,
      };
      if (!activityPatch || !(await updateUser(activityPatch))) {
        throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
      }
      showToast(updatedUser.show_activity_status === false ? 'Đã ẩn trạng thái hoạt động.' : 'Đã bật trạng thái hoạt động.');
    } catch (error) {
      showToast(error.message || 'Không thể cập nhật trạng thái hoạt động.');
    } finally {
      activityFlight.current = false;
      setActivitySaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Tài khoản" user={user} actions={[]} />
      <KeyboardScreen
        style={styles.root}
        contentContainerStyle={styles.content}
        extraBottomSpace={spacing.huge}
        includeSafeTop={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.text }]}>
          <View style={styles.avatarColumn}>
            <Avatar user={user} size={76} showStatus />
          </View>
          <View style={styles.identity}>
            <Text style={[styles.name, { color: colors.background }]} numberOfLines={2}>{user?.name || 'Người dùng'}</Text>
            <Text style={[styles.handle, { color: colors.background }]} numberOfLines={1}>
              {user?.username ? `@${user.username}` : user?.email}
            </Text>
            <Text style={[styles.bio, { color: colors.background }]} numberOfLines={3}>
              {user?.bio || (user?.is_online ? 'Đang hoạt động' : 'Sẵn sàng trò chuyện')}
            </Text>
          </View>
        </View>

        <SectionHeader title="Tài khoản" />
        <SettingsSection>
          <SettingsRow icon="mail-outline" label="Email" value={user?.email || 'Chưa cập nhật'} first />
          {user?.phone ? <SettingsRow icon="call-outline" label="Số điện thoại" value={user.phone} /> : null}
          <SettingsRow
            icon="at-outline"
            label="Tên người dùng"
            value={user?.username ? `@${user.username}` : 'Chưa đặt'}
            onPress={() => setShowUsernameSheet(true)}
            accessibilityHint="Mở bảng chỉnh sửa tên người dùng"
          />
          <SettingsRow
            icon="finger-print-outline"
            label="UID tài khoản"
            description="Nhấn để sao chép"
            value={hasValidUid ? uid : 'Đang đồng bộ'}
            onPress={hasValidUid ? handleCopyUid : undefined}
            disabled={!hasValidUid}
            accessibilityLabel={`UID tài khoản, ${getUidAccessibilityLabel(uid)}`}
            accessibilityHint={hasValidUid ? 'Sao chép UID vào bộ nhớ tạm' : 'UID chưa sẵn sàng'}
            valueTextStyle={styles.uidValue}
          />
          <SettingsRow
            icon="qr-code-outline"
            label="Mã QR của tôi"
            onPress={hasValidUid ? () => setShowQrSheet(true) : undefined}
            disabled={!hasValidUid}
            first={false}
            last
          />
        </SettingsSection>

        <SectionHeader title="Giao diện" />
        <SettingsSection>
          <SettingsRow
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Chế độ hiển thị"
            trailing={<ThemeToggle compact />}
            first
            last
          />
        </SettingsSection>

        <SectionHeader title="Thông báo" />
        <SettingsSection>
          <SettingsRow
            icon="notifications-outline"
            label="Cài đặt thông báo"
            value="Mở"
            onPress={() => navigation.navigate('NotificationSettings')}
            first
            last
          />
        </SettingsSection>

        <SectionHeader title="Quyền riêng tư & lưu trữ" />
        <SettingsSection>
          <SettingsRow
            icon="radio-outline"
            label="Trạng thái hoạt động"
            disabled={activitySaving}
            onPress={toggleActivityStatus}
            accessibilityRole="switch"
            accessibilityLabel={`Trạng thái hoạt động, ${activityEnabled ? 'đang bật' : 'đang tắt'}`}
            accessibilityState={{ checked: activityEnabled }}
            trailing={<View pointerEvents="none"><Switch value={activityEnabled} disabled={activitySaving} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} /></View>}
            first
          />
          <SettingsRow icon="folder-open-outline" label="Tệp đính kèm" value="Quản lý" onPress={() => navigation.navigate('AttachmentSettings')} last />
        </SettingsSection>

        <SectionHeader title="Bảo mật" />
        <SettingsSection>
          <SettingsRow
            icon="key-outline"
            label="Đổi mật khẩu"
            onPress={togglePasswordForm}
            value={showPwForm ? 'Đóng' : undefined}
            first
            last={!showPwForm}
          />
          {showPwForm ? (
            <View style={[styles.passwordPanel, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
              {pwError ? <ErrorState title="Không thể lưu mật khẩu" message={pwError} compact /> : null}
              <Input label="Mật khẩu hiện tại" value={pwForm.current} onChangeText={set('current')} secureTextEntry error={pwErrors.current} icon="lock-closed-outline" textContentType="password" autoComplete="current-password" />
              <Input label="Mật khẩu mới" value={pwForm.next} onChangeText={set('next')} secureTextEntry error={pwErrors.next} icon="key-outline" textContentType="newPassword" autoComplete="new-password" />
              <Input label="Xác nhận mật khẩu mới" value={pwForm.confirm} onChangeText={set('confirm')} secureTextEntry error={pwErrors.confirm} icon="checkmark-circle-outline" textContentType="newPassword" autoComplete="new-password" />
              <Button title="Lưu mật khẩu" icon="checkmark" onPress={handleChangePassword} loading={pwLoading} />
            </View>
          ) : null}
        </SettingsSection>

        <SectionHeader title="Giới thiệu" />
        <SettingsSection>
          <SettingsRow icon="information-circle-outline" label="Proxy" value={`v${appVersion}`} first last />
        </SettingsSection>

        <SectionHeader title="Phiên đăng nhập" />
        <SettingsSection>
          <SettingsRow icon="log-out-outline" label="Đăng xuất" onPress={() => setConfirmLogout(true)} danger first last />
        </SettingsSection>
      </KeyboardScreen>

      <ConfirmationDialog
        visible={confirmLogout}
        title="Đăng xuất khỏi thiết bị?"
        message="Bạn sẽ cần đăng nhập lại để tiếp tục nhắn tin."
        confirmLabel="Đăng xuất"
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); logout(); }}
      />

      <EditUsernameSheet
        visible={showUsernameSheet}
        onClose={() => setShowUsernameSheet(false)}
        currentUsername={user?.username}
        userId={user?.id}
        onSaved={handleUsernameSaved}
      />

      <MyQrSheet
        visible={showQrSheet}
        onClose={() => setShowQrSheet(false)}
        user={user}
        onNotify={showToast}
      />

      <ToastMessage message={toast} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.xl },
  hero: { minHeight: 184, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'flex-end', padding: spacing.xxl, marginBottom: spacing.xxxl, overflow: 'hidden' },
  avatarColumn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  identity: { flex: 1, marginLeft: spacing.lg },
  name: { fontFamily: typography.family.display, fontSize: typography.size.heading, lineHeight: typography.lineHeight.heading, fontWeight: typography.weight.heavy, letterSpacing: -0.7 },
  handle: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, marginTop: spacing.xs, opacity: 0.72 },
  bio: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.md, opacity: 0.82 },
  section: { marginBottom: spacing.xxl },
  passwordPanel: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  uidValue: { maxWidth: 128, fontFamily: typography.family.mono, fontSize: typography.size.caption, letterSpacing: 0.25 },
});
