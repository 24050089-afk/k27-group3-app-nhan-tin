import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, typography } from '../theme/tokens';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const getConversationPresentation = (conversation, currentUserId) => {
  const isGroup = conversation.type === 'group';
  const otherMember = conversation.members?.find((item) => Number(item.user_id) !== Number(currentUserId));
  const title = isGroup ? conversation.name || 'Nhóm chat' : otherMember?.user?.name || 'Người dùng';
  const avatarUser = isGroup ? { name: title, avatar: conversation.avatar } : otherMember?.user;
  const lastMessage = conversation.last_message;
  const isMine = Number(lastMessage?.sender_id) === Number(currentUserId);
  const isUnread = !!lastMessage
    && !isMine
    && Number(lastMessage.id) > Number(conversation.me?.last_read_message_id || 0);
  const messageType = lastMessage?.type;
  const mediaLabel = messageType === 'image'
    ? 'Đã gửi một ảnh'
    : messageType === 'voice'
      ? 'Tin nhắn thoại'
    : messageType && messageType !== 'text'
      ? 'Đã gửi một tệp'
      : !isGroup
        ? 'Bạn bè mới · Hãy gửi lời chào 👋'
        : 'Chưa có tin nhắn';
  const preview = conversation.locally_hidden_last
    ? 'Tin nhắn đã bị ẩn'
    : lastMessage?.recalled
      ? 'Tin nhắn đã được thu hồi'
      : lastMessage?.content || mediaLabel;
  const prefix = isMine ? 'Bạn: ' : isGroup && lastMessage?.sender?.name ? `${lastMessage.sender.name}: ` : '';

  return { isGroup, otherMember, title, avatarUser, lastMessage, isUnread, preview: `${prefix}${preview}` };
};

export default function ConversationRow({ conversation, currentUserId, onPress, onLongPress }) {
  const { colors } = useTheme();
  const presentation = getConversationPresentation(conversation, currentUserId);
  const { isGroup, title, avatarUser, lastMessage, isUnread, preview } = presentation;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: isUnread ? colors.unread : pressed ? colors.surfacePressed : colors.background },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Chưa đọc. ' : ''}Mở cuộc trò chuyện với ${title}`}
      accessibilityHint="Nhấn giữ để mở tùy chọn cuộc trò chuyện"
    >
      <Avatar user={avatarUser} size={54} showStatus={!isGroup} variant={isGroup ? 'group' : 'person'} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }, isUnread && styles.unreadTitle]} numberOfLines={1}>{title}</Text>
          {conversation.me?.pinned ? <Ionicons name="pin" size={iconSize.xs} color={colors.primary} style={styles.metaIcon} /> : null}
          <Text style={[styles.time, { color: isUnread ? colors.text : colors.textMuted }]}>
            {formatTime(lastMessage?.created_at ?? lastMessage?.createdAt ?? (!isGroup ? conversation.created_at ?? conversation.createdAt : null))}
          </Text>
        </View>
        <View style={styles.previewRow}>
          {conversation.draft ? <Text style={[styles.draft, { color: colors.danger }]}>Bản nháp · </Text> : null}
          <Text style={[styles.preview, { color: isUnread ? colors.text : colors.textMuted }, isUnread && styles.unreadPreview]} numberOfLines={1}>{preview}</Text>
          {conversation.me?.muted ? <Ionicons name="notifications-off" size={iconSize.xs} color={colors.textMuted} style={styles.metaIcon} /> : null}
          {isUnread ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} accessibilityLabel="Chưa đọc" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginVertical: spacing.xxs, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg },
  content: { flex: 1, marginLeft: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontFamily: typography.family.display, fontSize: typography.size.input, lineHeight: typography.lineHeight.input, fontWeight: typography.weight.semibold, letterSpacing: -0.2 },
  unreadTitle: { fontWeight: typography.weight.heavy },
  time: { fontFamily: typography.family.mono, fontSize: typography.size.micro, lineHeight: typography.lineHeight.micro, marginLeft: spacing.sm },
  previewRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  preview: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall },
  unreadPreview: { fontWeight: typography.weight.medium },
  draft: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  metaIcon: { marginLeft: spacing.sm },
  unreadDot: { width: 8, height: 8, borderRadius: radius.round, marginLeft: spacing.sm },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
