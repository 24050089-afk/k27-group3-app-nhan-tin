import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import SettingsRow from '../components/SettingsRow';
import ConfirmationDialog from '../components/ConfirmationDialog';
import useConversationDetails from '../hooks/useConversationDetails';
import useSocketStatus from '../hooks/useSocketStatus';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { getConversationMediaApi, leaveConversationApi, updateConversationApi, updateConversationSettingsApi } from '../api/conversation.api';
import { uploadChatImageApi } from '../api/upload.api';
import { permissionCountLabel, reactionRoleSummary } from '../utils/groupPermissions';
import { spacing, typography } from '../theme/tokens';

export default function GroupSettingsScreen(props) {
  const { user } = useAuth();
  return <GroupSettingsContent key={`${user?.id}:${props.route.params.conversationId}`} {...props} />;
}

function GroupSettingsContent({ route, navigation }) {
  const { conversationId, initialConversation, initialUserId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const connected = useSocketStatus();
  const insets = useSafeAreaInsets();
  const details = useConversationDetails(
    conversationId,
    String(initialUserId) === String(user?.id) ? initialConversation : null,
  );
  const group = details.data;
  const members = group?.members || [];
  const me = members.find((member) => String(member.user_id) === String(user?.id));
  const owner = String(group?.created_by) === String(user?.id);
  const canEdit = me?.role === 'admin';
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [mediaCounts, setMediaCounts] = useState(null);
  const [mediaCountError, setMediaCountError] = useState('');
  const flight = useRef(false);
  const mediaCountGeneration = useRef(0);

  const loadMediaCounts = useCallback(async () => {
    const request = ++mediaCountGeneration.current;
    try {
      const response = await getConversationMediaApi(conversationId, { type: 'image', page: 1, limit: 1 });
      if (request !== mediaCountGeneration.current) return;
      setMediaCounts(response.data.counts);
      setMediaCountError('');
    } catch (error) {
      if (request !== mediaCountGeneration.current) return;
      setMediaCountError(error.message || 'Chưa tải được số ảnh và video.');
      if ([401, 403, 404].includes(error.status)) setMediaCounts(null);
    }
  }, [conversationId]);

  useFocusEffect(useCallback(() => {
    loadMediaCounts();
    return () => { mediaCountGeneration.current += 1; };
  }, [loadMediaCounts]));

  useEffect(() => {
    if (details.error?.status === 404) navigation.navigate('Main', { screen: 'Chats' });
  }, [details.error, navigation]);

  const run = async (action) => {
    if (flight.current || !connected) return;
    flight.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      await details.refresh();
    } catch (error) {
      setMessage(error.message || 'Chưa cập nhật được. Vui lòng thử lại.');
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const changeAvatar = () => run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize > 10 * 1024 * 1024) throw new Error('Ảnh nhóm tối đa 10 MB.');
    const uploaded = await uploadChatImageApi(asset);
    await updateConversationApi(conversationId, { avatar: uploaded.data.file_url });
    setMessage('Đã cập nhật ảnh nhóm.');
  });
  const personalToggle = (key, value) => run(() => updateConversationSettingsApi(conversationId, { [key]: !value }));
  const openPermissions = () => navigation.navigate('GroupPermissions', {
    conversationId,
    initialConversation: group,
    initialUserId: user?.id,
  });
  const openMedia = (type) => navigation.navigate('SharedMedia', { conversationId, type });
  const muted = !!me?.muted;
  const pinned = !!me?.pinned;
  const disabled = busy || !connected || !details.verified || !!details.error;
  const textStyle = { color: colors.text, fontFamily: typography.family.body };
  const permissionScope = group?.role_permissions
    ? 'Theo vai trò'
    : group?.member_permissions
      ? 'Thành viên'
      : 'Chưa xác minh';
  const myPermissionSummary = permissionCountLabel(group?.my_capabilities);

  if (!group) return <View style={[styles.center, { backgroundColor: colors.background }]}>{details.loading ? <ActivityIndicator color={colors.primary} /> : <><Text style={textStyle}>{details.error?.message || 'Không tìm thấy nhóm.'}</Text><Button title="Thử lại" onPress={() => details.refresh().catch(() => {})} /></>}</View>;
  if (group.type !== 'group') return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={textStyle}>Cài đặt này chỉ dành cho nhóm.</Text></View>;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Pressable onPress={changeAvatar} disabled={!canEdit || disabled} accessibilityRole="button" accessibilityLabel={canEdit ? 'Đổi ảnh nhóm' : 'Ảnh nhóm'} accessibilityState={{ disabled: !canEdit || disabled }}>
            <Avatar user={group} size={88} variant="group" />
          </Pressable>
          <Text style={[textStyle, styles.title]}>{group.name}</Text>
          <Text style={{ color: colors.textMuted }}>Nhóm riêng · {members.length} thành viên</Text>
          {canEdit ? <Button title="Sửa thông tin nhóm" variant="ghost" disabled={disabled} onPress={() => { setName(group.name || ''); setEditing(!editing); }} /> : null}
        </View>
        {editing && canEdit ? <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={textStyle}>Tên nhóm</Text>
          <TextInput value={name} onChangeText={setName} maxLength={100} editable={!disabled} accessibilityLabel="Tên nhóm" style={[styles.input, textStyle, { borderColor: colors.border }]} />
          <View style={styles.actions}><Button title="Hủy" variant="ghost" disabled={busy} onPress={() => setEditing(false)} /><Button title="Lưu tên nhóm" loading={busy} disabled={disabled || !name.trim()} onPress={() => run(async () => { await updateConversationApi(conversationId, { name: name.trim() }); setEditing(false); })} /></View>
        </View> : null}
        <Text style={[styles.heading, { color: colors.primary }]}>QUẢN LÝ NHÓM</Text>
        <View style={{ backgroundColor: colors.surface }}>
          <SettingsRow icon="key-outline" label="Quyền trong nhóm" description={`Quyền của bạn: ${myPermissionSummary}`} value={permissionScope} onPress={openPermissions} first />
          <SettingsRow icon="heart-outline" label="Thả cảm xúc" value={reactionRoleSummary(group)} valueNumberOfLines={4} valueTextStyle={styles.permissionValue} onPress={openPermissions} />
          <SettingsRow icon="shield-checkmark-outline" label="Quản trị viên" value={members.filter((member) => member.role === 'admin').length} onPress={() => setList(list === 'admins' ? null : 'admins')} />
          <SettingsRow icon="people-outline" label="Thành viên" value={members.length} onPress={() => setList(list === 'members' ? null : 'members')} last />
        </View>
        {list ? <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.heading, { color: colors.primary }]}>{list === 'admins' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN'}</Text>
          {members.filter((member) => list !== 'admins' || member.role === 'admin').map((member) => <View key={member.user_id} style={styles.member}>
            <Avatar user={member.user} size={40} /><View style={{ flex: 1 }}><Text style={textStyle}>{member.user?.name || member.user?.username || 'Thành viên'}</Text><Text style={{ color: colors.textMuted }}>{String(member.user_id) === String(group.created_by) ? 'Nhóm trưởng' : member.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</Text></View>
          </View>)}
        </View> : null}
        <Text style={[styles.heading, { color: colors.primary }]}>NỘI DUNG ĐÃ CHIA SẺ</Text>
        <View style={{ backgroundColor: colors.surface }}>
          <SettingsRow icon="images-outline" label="Ảnh" value={mediaCounts ? String(mediaCounts.images) : '…'} onPress={() => openMedia('image')} first />
          <SettingsRow icon="videocam-outline" label="Video" value={mediaCounts ? String(mediaCounts.videos) : '…'} onPress={() => openMedia('video')} last />
        </View>
        {mediaCountError ? <><Text accessibilityRole="alert" style={[styles.note, textStyle]}>{mediaCountError}</Text><Button title="Tải lại số lượng" variant="ghost" onPress={loadMediaCounts} /></> : null}
        <Text style={[styles.heading, { color: colors.primary }]}>CÀI ĐẶT CỦA BẠN</Text>
        <View style={{ backgroundColor: colors.surface }}>
          <SettingsRow icon="pin-outline" label="Ghim cuộc trò chuyện" disabled={disabled} onPress={() => personalToggle('pinned', pinned)} trailing={<View pointerEvents="none"><Switch value={pinned} disabled={disabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} /></View>} first />
          <SettingsRow icon="notifications-off-outline" label="Tắt thông báo" disabled={disabled} onPress={() => personalToggle('muted', muted)} trailing={<View pointerEvents="none"><Switch value={muted} disabled={disabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} /></View>} last />
        </View>
        {!connected ? <Text style={[styles.note, { color: colors.warning }]}>Bạn đang ngoại tuyến. Kết nối lại để thay đổi cài đặt.</Text> : null}
        {details.error ? <Button title="Tải lại cài đặt" variant="outline" onPress={() => details.refresh().catch(() => {})} /> : null}
        {message ? <Text accessibilityRole="alert" style={[styles.note, textStyle]}>{message}</Text> : null}
        {owner ? <Text style={[styles.note, { color: colors.textMuted }]}>Nhóm trưởng chưa thể rời nhóm khi chưa chuyển quyền.</Text> : <SettingsRow icon="exit-outline" label="Rời nhóm" danger disabled={disabled} onPress={() => setConfirmLeave(true)} />}
      </ScrollView>
      <ConfirmationDialog visible={confirmLeave} title="Rời nhóm?" message="Bạn sẽ không còn gửi tin nhắn hoặc nhận cập nhật từ nhóm này." confirmLabel="Rời nhóm" danger loading={busy} onCancel={() => { if (!busy) setConfirmLeave(false); }} onConfirm={() => run(async () => { await leaveConversationApi(conversationId); setConfirmLeave(false); navigation.navigate('Main', { screen: 'Chats' }); })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.lg },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  heading: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xxl, marginBottom: spacing.md },
  section: { padding: spacing.lg, marginTop: spacing.md }, input: { borderBottomWidth: 1, minHeight: 48, marginVertical: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  note: { fontSize: 13, lineHeight: 20, marginVertical: spacing.md },
  permissionValue: { maxWidth: 160, textAlign: 'right' },
});
