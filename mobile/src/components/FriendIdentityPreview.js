import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import Button from './Button';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

const relationshipCopy = {
  self: 'Đây là mã tài khoản của bạn.',
  none: 'Bạn chưa kết bạn với người này.',
  outgoing_pending: 'Lời mời kết bạn đang chờ phản hồi.',
  incoming_pending: 'Người này đã gửi lời mời kết bạn cho bạn.',
  accepted: 'Hai bạn đã là bạn bè.',
  blocked: 'Không thể kết nối với tài khoản này.',
};

export default function FriendIdentityPreview({
  result,
  busy = false,
  error = '',
  onSendRequest,
  onAcceptRequest,
  onOpenChat,
  onScanAgain,
}) {
  const { colors } = useTheme();
  const user = result?.user;
  const relationship = result?.relationship;
  if (!user) return null;

  const primaryAction = relationship === 'none'
    ? { title: 'Gửi lời mời kết bạn', icon: 'person-add-outline', onPress: onSendRequest }
    : relationship === 'incoming_pending'
      ? { title: 'Chấp nhận lời mời', icon: 'checkmark-circle-outline', onPress: onAcceptRequest }
      : relationship === 'accepted'
        ? { title: 'Nhắn tin', icon: 'chatbubble-ellipses-outline', onPress: onOpenChat }
        : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Avatar user={user} size={72} showStatus />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{user.name || 'Người dùng'}</Text>
      {user.username ? <Text style={[styles.username, { color: colors.primary }]}>@{user.username}</Text> : null}
      <Text style={[styles.uid, { color: colors.textMuted }]}>{user.uid}</Text>
      {user.bio ? <Text style={[styles.bio, { color: colors.textMuted }]} numberOfLines={3}>{user.bio}</Text> : null}
      <View style={[styles.status, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.statusText, { color: colors.textMuted }]}>{relationshipCopy[relationship] || 'Không xác định được quan hệ.'}</Text>
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]} accessibilityRole="alert">{error}</Text> : null}
      <View style={styles.actions}>
        {primaryAction ? <Button {...primaryAction} loading={busy} disabled={busy} /> : null}
        {relationship === 'outgoing_pending' ? <Button title="Đã gửi lời mời" icon="time-outline" disabled /> : null}
        <Button title="Quét mã khác" variant="outline" icon="scan-outline" onPress={onScanAgain} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xxl, alignItems: 'center' },
  name: { marginTop: spacing.md, textAlign: 'center', fontFamily: typography.family.display, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.heavy },
  username: { marginTop: spacing.xs, fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  uid: { marginTop: spacing.xs, fontFamily: typography.family.mono, fontSize: typography.size.caption, letterSpacing: 0.8 },
  bio: { marginTop: spacing.md, textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall },
  status: { width: '100%', marginTop: spacing.lg, borderRadius: radius.md, padding: spacing.md },
  statusText: { textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall },
  error: { marginTop: spacing.md, textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.bodySmall },
  actions: { width: '100%', marginTop: spacing.lg, gap: spacing.sm },
});
