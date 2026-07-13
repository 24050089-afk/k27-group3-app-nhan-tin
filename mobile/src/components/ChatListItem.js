import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../store/ThemeContext';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatListItem({ conversation, currentUserId, onPress }) {
  const { colors } = useTheme();
  const isGroup = conversation.type === 'group';
  const otherMember = conversation.members?.find((item) => item.user_id !== currentUserId);
  const title = isGroup ? conversation.name || 'Nhom chat' : otherMember?.user?.name || 'Nguoi dung';
  const avatarUser = isGroup ? { name: title, avatar: conversation.avatar } : otherMember?.user;
  const lastMessage = conversation.last_message;
  const preview = lastMessage?.recalled
    ? 'Tin nhắn đã được thu hồi'
    : lastMessage?.content || (lastMessage ? 'Ảnh đính kèm' : 'Chưa có tin nhắn');

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Mở cuộc trò chuyện với ${title}`}
    >
      <Avatar user={avatarUser} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime(lastMessage?.created_at)}</Text>
        </View>
        <View style={styles.previewRow}>
          {lastMessage?.attachments?.length ? <Ionicons name="image-outline" size={14} color={colors.textMuted} style={styles.previewIcon} /> : null}
          <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={1}>
            {lastMessage?.sender ? `${lastMessage.sender.name}: ` : ''}{preview}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 72,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  content: { flex: 1, marginLeft: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  time: { fontSize: 12, marginLeft: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  previewIcon: { marginRight: 4 },
  preview: { flex: 1, fontSize: 13 },
});
