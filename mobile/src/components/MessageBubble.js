import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

const statusLabelMap = {
  sent: 'Đã gửi',
  delivered: 'Đã nhận',
  seen: 'Đã xem',
};

export default function MessageBubble({ message, mine, onLongPress }) {
  const { colors } = useTheme();
  const reactions = message.reactions || [];
  const attachments = message.attachments || [];
  const imageAttachments = attachments.filter((item) => String(item.file_type || '').startsWith('image/'));
  const statusLabel = mine ? statusLabelMap[message.outgoing_status] || 'Đã gửi' : '';
  const statusIcon = message.outgoing_status === 'seen' ? 'checkmark-done' : 'checkmark';
  const hasText = !!String(message.content || '').trim();

  return (
    <TouchableOpacity
      style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirWrapper]}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityHint="Nhấn giữ để mở tùy chọn tin nhắn"
    >
      {!mine && <Text style={[styles.sender, { color: colors.textMuted }]}>{message.sender?.name}</Text>}
      <View
        style={[
          styles.bubble,
          mine ? styles.mine : styles.their,
          {
            backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheir,
            borderColor: colors.border,
          },
        ]}
      >
        {imageAttachments.map((item) => (
          <Image key={item.id || item.file_url} source={{ uri: item.file_url }} style={styles.image} />
        ))}
        {message.recalled ? (
          <Text style={[styles.content, { color: mine ? colors.bubbleMineText : colors.text }]}>
            Tin nhắn đã được thu hồi
          </Text>
        ) : null}
        {!message.recalled && hasText ? (
          <Text style={[styles.content, { color: mine ? colors.bubbleMineText : colors.text }]}>
            {message.content}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: mine ? colors.primarySoft : colors.textMuted }]}>
          {message.edited ? 'đã sửa · ' : ''}
          {formatTime(message.created_at)}
        </Text>
        {mine ? (
          <View style={styles.statusRow}>
            <Ionicons name={statusIcon} size={13} color={colors.primarySoft} />
            <Text style={[styles.status, { color: colors.primarySoft }]}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
      {reactions.length > 0 && (
        <View
          style={[
            styles.reactions,
            mine ? styles.mineReactions : styles.theirReactions,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.reactionText, { color: colors.text }]}>
            {reactions.map((item) => item.type).join(' ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { maxWidth: '82%', marginHorizontal: 12, marginVertical: 5 },
  mineWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { fontSize: 12, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { borderTopRightRadius: 4 },
  their: { borderTopLeftRadius: 4, borderWidth: 1 },
  image: {
    width: 220,
    height: 220,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#E5E7EB',
  },
  content: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  statusRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  status: { fontSize: 10, marginLeft: 3, fontWeight: '700' },
  reactions: {
    marginTop: -4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  mineReactions: { marginRight: 8 },
  theirReactions: { marginLeft: 8 },
  reactionText: { fontSize: 12 },
});
