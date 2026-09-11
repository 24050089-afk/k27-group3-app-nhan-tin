import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import SectionHeader from '../components/SectionHeader';
import SettingsRow from '../components/SettingsRow';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { useTheme } from '../store/ThemeContext';
import { spacing } from '../theme/tokens';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { pushSupported, isExpoGo, preferences, permission, pushStatus, refreshPreferences, refreshPermission, registerForPush, sendLocalTestNotification, updatePreferences } = useNotifications();
  const [loading, setLoading] = useState(!preferences);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { await Promise.all([refreshPreferences(), refreshPermission()]); } catch (err) { setError(err.message || 'Không thể tải cài đặt thông báo.'); } finally { setLoading(false); }
  }, [refreshPermission, refreshPreferences]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (key, value) => {
    setSaving(key); setError('');
    try { await updatePreferences({ [key]: value }); } catch (err) { setError(err.message || 'Không thể lưu cài đặt.'); } finally { setSaving(''); }
  };
  const enablePush = async () => {
    setSaving('permission'); setError('');
    const result = await registerForPush({ requestPermission: true });
    if (!result.registered) {
      if (result.reason === 'project_unconfigured') setError('Push chưa sẵn sàng vì ứng dụng chưa có EAS project ID thật.');
      else if (result.reason === 'expo_go_unsupported') setError('Expo Go không hỗ trợ push trên Android SDK 54. Hãy dùng development build để kiểm tra.');
      else if (result.reason === 'unsupported') setError('Thiết bị hoặc nền tảng này không hỗ trợ thông báo đẩy.');
      else if (result.reason === 'simulator') setError('Thông báo push chỉ hoạt động trên thiết bị thật.');
      else if (result.reason === 'permission_denied') setError('Bạn chưa cấp quyền thông báo. Hãy mở Cài đặt nếu muốn bật lại.');
      else if (result.reason === 'error') setError(result.error?.message || 'Không thể đăng ký thiết bị nhận thông báo.');
    }
    setSaving('');
  };
  const testLocalNotification = async () => {
    setSaving('local-test'); setError(''); setTestMessage('');
    const result = await sendLocalTestNotification();
    if (result.scheduled) setTestMessage('Đã hẹn thông báo sau 5 giây. Hãy đưa ứng dụng về nền để kiểm tra khay hệ thống.');
    else if (result.reason === 'permission_denied') setError('Bạn chưa cấp quyền thông báo cho ứng dụng.');
    else if (result.reason === 'expo_go_unsupported') setError('Thông báo native cần development build trên Android SDK 54.');
    else setError(result.error?.message || 'Không thể tạo thông báo thử.');
    setSaving('');
  };
  if (loading) return <View style={[styles.screen, { backgroundColor: colors.background }]}><LoadingState count={5} /></View>;
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><AppHeader title="Thông báo" subtitle="Chọn điều bạn muốn nhận" user={user} showAvatar={false} />
    <ScrollView contentContainerStyle={styles.content}>
      {error ? <ErrorState title="Cần chú ý" message={error} compact onRetry={load} /> : null}
      <SectionHeader title="Quyền trên thiết bị" description="Push chỉ gửi khi hệ điều hành cho phép." />
      <View style={styles.section}><SettingsRow icon="notifications-outline" label="Thông báo đẩy" description={!pushSupported ? (isExpoGo ? 'Cần development build để kiểm tra push trên SDK 54.' : 'Không hỗ trợ trên nền tảng hiện tại.') : permission?.granted ? `Đã cho phép${pushStatus === 'registered' ? ' và đã đăng ký thiết bị' : ''}.` : 'Cấp quyền để nhận tin khi ứng dụng đang đóng.'} value={!pushSupported ? 'Dev build' : permission?.granted ? 'Đã bật' : 'Chưa bật'} onPress={pushSupported && !permission?.granted ? enablePush : undefined} first last disabled={saving === 'permission'} /></View>
      {__DEV__ && pushSupported ? <View style={styles.section}><SettingsRow icon="flask-outline" label="Gửi thông báo thử" description="Tạo thông báo cục bộ sau 5 giây để kiểm tra quyền, channel và banner." value="5 giây" onPress={testLocalNotification} first last disabled={saving === 'local-test'} /></View> : null}
      {testMessage ? <Text style={[styles.feedback, { color: colors.success }]}>{testMessage}</Text> : null}
      {pushSupported && permission && !permission.granted && !permission.canAskAgain ? <SettingsRow icon="settings-outline" label="Mở Cài đặt hệ thống" description="Quyền đã bị từ chối vĩnh viễn trên thiết bị này." onPress={() => Linking.openSettings()} first last /> : null}
      <SectionHeader title="Nội dung thông báo" description="Các thay đổi này chỉ áp dụng cho push; hoạt động vẫn xuất hiện trong trung tâm thông báo." />
      <View style={styles.section}>
        <SettingsRow icon="chatbubble-ellipses-outline" label="Tin nhắn" description="Tin nhắn riêng, nhóm và trả lời trực tiếp." trailing={<Switch value={preferences?.push_messages ?? true} onValueChange={(value) => toggle('push_messages', value)} disabled={saving === 'push_messages'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} />} first />
        <SettingsRow icon="people-outline" label="Bạn bè" description="Lời mời và xác nhận kết bạn." trailing={<Switch value={preferences?.push_social ?? true} onValueChange={(value) => toggle('push_social', value)} disabled={saving === 'push_social'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} />} />
        <SettingsRow icon="people-circle-outline" label="Cập nhật nhóm" description="Khi bạn được thêm vào một nhóm." trailing={<Switch value={preferences?.push_group_updates ?? true} onValueChange={(value) => toggle('push_group_updates', value)} disabled={saving === 'push_group_updates'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} />} />
        <SettingsRow icon="eye-off-outline" label="Ẩn nội dung tin nhắn" description="Không hiển thị preview trên thông báo đẩy." trailing={<Switch value={preferences?.hide_message_preview ?? false} onValueChange={(value) => toggle('hide_message_preview', value)} disabled={saving === 'hide_message_preview'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} />} last />
      </View>
      <Text style={[styles.note, { color: colors.textMuted }]}>Tắt thông báo cho từng cuộc trò chuyện vẫn được quản lý trực tiếp trong màn hình chat.</Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { paddingBottom: spacing.huge }, section: { marginHorizontal: spacing.lg, marginBottom: spacing.sm }, feedback: { marginHorizontal: spacing.xl, marginBottom: spacing.md, fontSize: 13, lineHeight: 19 }, note: { marginHorizontal: spacing.xl, marginTop: spacing.lg, fontSize: 13, lineHeight: 19 }, });
