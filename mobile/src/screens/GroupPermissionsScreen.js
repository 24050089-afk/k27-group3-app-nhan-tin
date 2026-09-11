import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateGroupPermissionsApi } from '../api/conversation.api';
import useConversationDetails from '../hooks/useConversationDetails';
import useSocketStatus from '../hooks/useSocketStatus';
import { useTheme } from '../store/ThemeContext';
import { useAuth } from '../store/AuthContext';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PermissionSwitchRow from '../components/PermissionSwitchRow';
import { GROUP_ROLES, PERMISSION_FIELDS, ROLE_PERMISSION_FIELDS, permissionChanges, permissionCount, permissionCountLabel } from '../utils/groupPermissions';
import { layout, spacing, typography } from '../theme/tokens';

export default function GroupPermissionsScreen(props) {
  const { user } = useAuth();
  return <GroupPermissionsContent key={`${user?.id}:${props.route.params.conversationId}`} {...props} />;
}

function GroupPermissionsContent({ route, navigation }) {
  const { conversationId, initialConversation, initialUserId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const connected = useSocketStatus();
  const initialSnapshot = String(initialUserId) === String(user?.id) ? initialConversation : null;
  const details = useConversationDetails(
    conversationId,
    initialSnapshot,
  );
  const initialPolicy = initialSnapshot?.role_permissions?.member
    ? { ...initialSnapshot.role_permissions.member, version: initialSnapshot.role_permissions.version }
    : initialSnapshot?.member_permissions || null;
  const [saved, setSaved] = useState(initialPolicy);
  const [draft, setDraft] = useState(initialPolicy);
  const [selectedRole, setSelectedRole] = useState('member');
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const flight = useRef(false);
  const snapshotRef = useRef(details.data);
  snapshotRef.current = details.data;
  const dirty = !!saved && !!draft && Object.keys(draft).some((key) => key !== 'version' && draft[key] !== saved[key]);
  const roleSnapshot = details.data?.role_permissions;
  const policy = useMemo(() => (
    roleSnapshot
      ? (roleSnapshot[selectedRole] ? { ...roleSnapshot[selectedRole], version: roleSnapshot.version } : null)
      : details.data?.member_permissions
  ), [roleSnapshot, selectedRole, details.data?.member_permissions]);
  const canManage = details.data?.my_capabilities?.manage_permissions === true;
  const myRole = details.data?.my_capabilities?.role;
  const isOwner = Number(details.data?.created_by) === Number(user?.id);
  const conflict = !!saved && !!policy && policy.version !== saved.version;
  const disabled = !canManage || !connected || saving || conflict || !!details.error || details.loading;
  const policyVerified = permissionCount(policy) !== null
    && Number.isSafeInteger(policy?.version)
    && policy.version >= 1;
  const selectedRoleLabel = roleSnapshot
    ? GROUP_ROLES.find(({ key }) => key === selectedRole)?.label
    : 'Thành viên';

  useEffect(() => {
    if (policy && !dirty && !flight.current) { setSaved(policy); setDraft(policy); }
  }, [policy, dirty]);
  useEffect(() => {
    if (details.error?.status === 404) navigation.navigate('Main', { screen: 'Chats' });
  }, [details.error, navigation]);

  const reset = () => { if (policy) { setSaved(policy); setDraft(policy); } setMessage(''); };
  const save = async () => {
    if (flight.current || disabled || !dirty) return;
    flight.current = true; setSaving(true); setMessage(''); details.invalidate();
    try {
      const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => key !== 'version' && value !== saved?.[key]));
      const response = await updateGroupPermissionsApi(conversationId, roleSnapshot ? { role: selectedRole, permissions: changes, expected_version: saved.version } : { ...permissionChanges(saved, draft), expected_version: saved.version });
      const responseVersion = response.data.role_permissions?.version
        ?? response.data.member_permissions?.version;
      const currentSnapshot = snapshotRef.current;
      const currentVersion = currentSnapshot?.role_permissions?.version
        ?? currentSnapshot?.member_permissions?.version;
      // A refetch/socket update may have installed a newer snapshot while the
      // PATCH was in flight. Never let the older response roll it back.
      if (Number.isSafeInteger(currentVersion) && Number.isSafeInteger(responseVersion)
        && responseVersion < currentVersion) return;
      const latestBeforeCommit = snapshotRef.current;
      const latestVersionBeforeCommit = latestBeforeCommit?.role_permissions?.version
        ?? latestBeforeCommit?.member_permissions?.version;
      if (Number.isSafeInteger(latestVersionBeforeCommit) && Number.isSafeInteger(responseVersion)
        && responseVersion < latestVersionBeforeCommit) return;
      details.setData((current) => {
        const latestVersion = current?.role_permissions?.version
          ?? current?.member_permissions?.version;
        if (Number.isSafeInteger(latestVersion) && Number.isSafeInteger(responseVersion)
          && responseVersion < latestVersion) return current;
        return { ...current, ...response.data };
      });
      const next = response.data.role_permissions?.[selectedRole]
        ? { ...response.data.role_permissions[selectedRole], version: response.data.role_permissions.version }
        : response.data.member_permissions;
      setSaved(next); setDraft(next);
      setMessage('Đã lưu quyền trong nhóm.');
      AccessibilityInfo.announceForAccessibility('Đã lưu quyền trong nhóm.');
    } catch (error) {
      setMessage(error.message || 'Không thể lưu quyền. Vui lòng thử lại.');
      AccessibilityInfo.announceForAccessibility(error.message || 'Không thể lưu quyền.');
      await details.refresh().catch(() => {});
    } finally { flight.current = false; setSaving(false); }
  };

  if (!details.data && details.loading) return <View style={[styles.root, { backgroundColor: colors.background }]}><LoadingState count={5} /></View>;
  if (!details.data) return <View style={[styles.root, { backgroundColor: colors.background }]}><ErrorState title="Không tải được quyền" message={details.error?.message} onRetry={() => details.refresh().catch(() => {})} /></View>;
  if (details.data.type !== 'group') return <View style={[styles.root, { backgroundColor: colors.background }]}><ErrorState title="Chỉ áp dụng cho nhóm" message="Cuộc trò chuyện riêng không có cài đặt quyền trong nhóm." /></View>;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.headingRow}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{selectedRoleLabel?.toUpperCase()} CÓ THỂ LÀM GÌ?</Text>
            <Text style={[styles.count, { color: colors.primary }]}>{policyVerified && draft ? permissionCountLabel(draft) : 'Chưa xác minh'}</Text>
          </View>
          <Text style={[styles.note, { color: colors.textMuted }]}>{roleSnapshot ? 'Mỗi vai trò có cấu hình riêng.' : 'Máy chủ chỉ xác minh quyền Thành viên.'}</Text>
        </View>
        {roleSnapshot ? <View style={styles.roleSelector}>{GROUP_ROLES.map(({ key, label }) => <Pressable key={key} onPress={() => { if (!dirty && !saving) setSelectedRole(key); }} disabled={dirty || saving} accessibilityRole="button" accessibilityLabel={`${label}${myRole === key ? ', Bạn' : ''}, ${permissionCountLabel(roleSnapshot[key])}`} accessibilityState={{ selected: selectedRole === key, disabled: dirty || saving }} style={[styles.roleButton, { borderColor: selectedRole === key ? colors.primary : colors.divider }]}><View style={styles.roleLabelRow}><Text style={[styles.roleLabel, { color: selectedRole === key ? colors.primary : colors.text }]}>{label}</Text>{myRole === key ? <Text style={[styles.youBadge, { color: colors.primary }]}>Bạn</Text> : null}</View><Text style={[styles.roleCount, { color: colors.textMuted }]}>{permissionCountLabel(roleSnapshot[key])}</Text></Pressable>)}</View> : null}
        {roleSnapshot && dirty ? <Text style={[styles.help, { color: colors.warning }]}>Lưu hoặc Hủy thay đổi trước khi chuyển vai trò.</Text> : null}
        {!policy || !draft || !policyVerified ? <ErrorState compact title="Quyền chưa xác minh" message="Chưa tải được đầy đủ cấu hình quyền của vai trò này. Hãy thử lại sau." onRetry={() => details.refresh().catch(() => {})} /> : (
          <>
            <PermissionSwitchRow label={(roleSnapshot ? ROLE_PERMISSION_FIELDS[0] : PERMISSION_FIELDS[0]).label} icon={(roleSnapshot ? ROLE_PERMISSION_FIELDS[0] : PERMISSION_FIELDS[0]).icon} value={draft[roleSnapshot ? 'send_text_messages' : 'members_can_send_text_messages']} disabled={disabled} onChange={(value) => setDraft((current) => ({ ...current, [roleSnapshot ? 'send_text_messages' : 'members_can_send_text_messages']: value }))} />
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <PermissionSwitchRow label={(roleSnapshot ? ROLE_PERMISSION_FIELDS[1] : PERMISSION_FIELDS[1]).label} icon={(roleSnapshot ? ROLE_PERMISSION_FIELDS[1] : PERMISSION_FIELDS[1]).icon} value={draft[roleSnapshot ? 'send_media' : 'members_can_send_media']} disabled={disabled} onChange={(value) => setDraft((current) => ({ ...current, [roleSnapshot ? 'send_media' : 'members_can_send_media']: value }))} />
              <Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityLabel="Các loại phương tiện" accessibilityState={{ expanded }} style={styles.expand}>
                <Text style={[styles.expandText, { color: colors.primary }]}>Loại phương tiện · {[draft[roleSnapshot ? 'send_photos' : 'members_can_send_photos'], draft[roleSnapshot ? 'send_voice_messages' : 'members_can_send_voice_messages']].filter(Boolean).length}/2</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </Pressable>
              {expanded ? (roleSnapshot ? ROLE_PERMISSION_FIELDS.slice(2, 4) : PERMISSION_FIELDS.slice(2, 4)).map((field) => (
                <PermissionSwitchRow key={field.key} label={field.label} icon={field.icon} child value={draft[field.key]} disabled={disabled || !draft[roleSnapshot ? 'send_media' : 'members_can_send_media']} onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))} />
              )) : null}
            </View>
            <Text style={[styles.help, { color: colors.textMuted }]}>Video hiện cần bật cả Gửi phương tiện, Ảnh và Tin nhắn thoại. Tắt Gửi phương tiện sẽ khóa hai quyền con; lựa chọn từng loại được giữ lại khi bật lại.</Text>
            <PermissionSwitchRow label={(roleSnapshot ? ROLE_PERMISSION_FIELDS[4] : PERMISSION_FIELDS[4]).label} icon={(roleSnapshot ? ROLE_PERMISSION_FIELDS[4] : PERMISSION_FIELDS[4]).icon} value={draft[roleSnapshot ? 'react' : 'members_can_react']} disabled={disabled} onChange={(value) => setDraft((current) => ({ ...current, [roleSnapshot ? 'react' : 'members_can_react']: value }))} description="Bạn vẫn có thể gỡ cảm xúc của chính mình." />
          </>
        )}
        {!connected ? <Text style={[styles.help, { color: colors.warning }]} accessibilityRole="alert">Bạn đang ngoại tuyến. Kết nối lại để lưu thay đổi.</Text> : null}
        {!canManage ? <Text style={[styles.help, { color: colors.textMuted }]}>{isOwner ? 'Nhóm đang tạm khóa thay đổi quyền. Bạn vẫn có thể xem cấu hình hiện tại.' : 'Chỉ nhóm trưởng có thể thay đổi các quyền này.'}</Text> : null}
        {conflict ? <View style={styles.intro}>
          <Text style={[styles.note, { color: colors.warning }]} accessibilityRole="alert">Quyền vừa thay đổi trên thiết bị khác. Tải cấu hình mới trước khi chỉnh sửa tiếp.</Text>
          <Button title="Dùng cấu hình mới" variant="ghost" onPress={reset} />
        </View> : null}
        {details.error ? <ErrorState compact title="Không thể làm mới" message={details.error.message} onRetry={() => details.refresh().catch(() => {})} /> : null}
        {message ? <Text style={[styles.help, { color: colors.primary }]} accessibilityLiveRegion="polite">{message}</Text> : null}
        <Text style={[styles.help, { color: colors.textMuted }]}>Thay đổi chỉ có hiệu lực sau khi nhấn Lưu và được máy chủ xác nhận.</Text>
      </ScrollView>
      {isOwner && draft ? <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button title="Hủy" variant="ghost" onPress={reset} disabled={!dirty || saving} style={styles.button} />
        <Button title="Lưu thay đổi" onPress={save} loading={saving} disabled={!dirty || disabled} style={styles.button} />
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: spacing.xxl },
  intro: { padding: spacing.xl }, headingRow: { gap: spacing.xs },
  eyebrow: { flex: 1, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold, letterSpacing: 0.6, lineHeight: typography.lineHeight.body },
  count: { fontFamily: typography.family.mono, fontSize: typography.size.bodySmall },
  note: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.body, marginTop: spacing.sm },
  section: { marginTop: spacing.md }, expand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  expandText: { fontSize: typography.size.bodySmall, fontWeight: typography.weight.medium },
  help: { marginHorizontal: spacing.xl, marginVertical: spacing.md, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.body },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md }, button: { flex: 1 }, roleSelector: { gap: spacing.sm, paddingHorizontal: spacing.xl }, roleButton: { minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
  roleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, roleLabel: { fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  youBadge: { fontSize: typography.size.caption, fontWeight: typography.weight.bold }, roleCount: { marginTop: spacing.xs, fontSize: typography.size.caption },
});
