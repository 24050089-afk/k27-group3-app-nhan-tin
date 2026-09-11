import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import Avatar from './Avatar';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import { useTheme } from '../store/ThemeContext';
import { getAttachmentMediaKind, isVoiceAttachment } from '../utils/messageActions';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { componentState, iconSize, layout, motion, radius, spacing, typography } from '../theme/tokens';

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '';

const statusLabelMap = {
  sending: 'Đang gửi',
  sent: 'Đã gửi',
  delivered: 'Đã nhận',
  seen: 'Đã xem',
  failed: 'Gửi thất bại',
};

const reactionIcons = {
  heart: 'heart',
  like: 'thumbs-up',
};

const formatFileSize = (value) => {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return 'Tệp đính kèm';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileName = (url) => {
  const raw = String(url || '').split('?')[0].split('/').pop();
  if (!raw) return 'Tệp đính kèm';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const getClusterShape = (mine, position) => {
  if (position === 'single') return mine ? styles.mineSingle : styles.theirSingle;
  if (position === 'first') return mine ? styles.mineFirst : styles.theirFirst;
  if (position === 'middle') return mine ? styles.mineMiddle : styles.theirMiddle;
  return mine ? styles.mineLast : styles.theirLast;
};

export function DateSeparator({ value }) {
  const { colors } = useTheme();
  const date = new Date(value);
  const today = new Date();
  const label = date.toDateString() === today.toDateString()
    ? 'Hôm nay'
    : date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <View style={styles.dateRow}>
      <View style={[styles.dateLine, { backgroundColor: colors.divider }]} />
      <Text style={[styles.dateText, { color: colors.textMuted, backgroundColor: colors.background }]}>{label}</Text>
      <View style={[styles.dateLine, { backgroundColor: colors.divider }]} />
    </View>
  );
}

export default function MessageBubble({
  message,
  mine,
  clusterPosition = 'single',
  showAvatar = false,
  showSender = false,
  showMeta = true,
  showStatus = false,
  onLongPress,
  onOpenMedia,
  onRetry,
  hiddenMessageIds,
  activeVoiceId,
  onVoicePlaybackChange,
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reactions = message.reactions || [];
  const attachments = message.attachments || [];
  const imageAttachments = attachments.filter((item) => getAttachmentMediaKind(item, message.type) === 'photo');
  const videoAttachments = attachments.filter((item) => getAttachmentMediaKind(item, message.type) === 'video');
  const voiceAttachments = attachments.filter((item) => isVoiceAttachment(item, message.type));
  const fileAttachments = attachments.filter((item) => !getAttachmentMediaKind(item, message.type) && !isVoiceAttachment(item, message.type));
  const maxBubbleWidth = Math.min(340, width * layout.bubbleMaxWidthRatio);
  const mediaWidth = Math.min(300, maxBubbleWidth - spacing.lg);
  const gridGap = spacing.xs;
  const imageCellWidth = imageAttachments.length === 1 ? mediaWidth : (mediaWidth - gridGap) / 2;
  const imageCellHeight = imageAttachments.length === 1 ? Math.min(mediaWidth, 280) : Math.min(150, imageCellWidth);
  const status = message.failed ? 'failed' : message.sending ? 'sending' : message.outgoing_status || 'sent';
  const statusLabel = statusLabelMap[status];
  const statusIcon = status === 'seen' ? 'checkmark-done' : status === 'failed' ? 'alert-circle' : 'checkmark';
  const hasText = !!String(message.content || '').trim();
  const isSystem = message.type === 'system';
  const hiddenReply = message.replyTo?.id !== null
    && message.replyTo?.id !== undefined
    && hiddenMessageIds?.has(String(message.replyTo.id));

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <Text style={[styles.systemText, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>{message.content}</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(motion.fast)} style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow, clusterPosition === 'last' || clusterPosition === 'single' ? styles.clusterEnd : styles.clusterTight]}>
      {!mine ? (
        <View style={styles.avatarSlot}>
          {showAvatar ? <Avatar user={message.sender} size={28} /> : null}
        </View>
      ) : null}
      <View style={[styles.messageColumn, mine ? styles.mineColumn : styles.theirColumn, { maxWidth: maxBubbleWidth }]}>
        {!mine && showSender && message.sender?.name ? (
          <Text style={[styles.sender, { color: colors.textMuted }]} numberOfLines={1}>{message.sender.name}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.pressTarget, pressed && styles.pressed]}
          onLongPress={() => onLongPress?.(message, null)}
          accessibilityRole="button"
          accessibilityHint="Nhấn giữ để mở tùy chọn tin nhắn"
        >
          <View
            style={[
              styles.bubble,
              getClusterShape(mine, clusterPosition),
              {
                backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheir,
                borderColor: mine ? colors.bubbleMine : colors.border,
              },
            ]}
          >
            {!message.recalled && message.replyTo ? (
              <View style={[styles.reply, { backgroundColor: mine ? colors.bubbleMineSurface : colors.surfaceAlt, borderLeftColor: mine ? colors.bubbleMineMuted : colors.primary }]}>
                <Text style={[styles.replySender, { color: mine ? colors.bubbleMineMuted : colors.primary }]} numberOfLines={1}>{message.replyTo.sender?.name || 'Tin nhắn đã trả lời'}</Text>
                <Text style={[styles.replyText, { color: mine ? colors.bubbleMineText : colors.textMuted }]} numberOfLines={2}>
                  {hiddenReply ? 'Tin nhắn đã bị ẩn' : message.replyTo.content || (message.replyTo.type === 'voice' ? 'Tin nhắn thoại' : 'Nội dung đính kèm')}
                </Text>
              </View>
            ) : null}

            {!message.recalled && imageAttachments.length > 0 ? (
              <View style={[styles.imageGrid, { width: mediaWidth, gap: gridGap }]}>
                {imageAttachments.map((item) => (
                  <Pressable
                    key={item.id || item.file_url}
                    onPress={() => onOpenMedia?.(message, item)}
                    onLongPress={() => onLongPress?.(message, item)}
                    style={({ pressed }) => pressed && styles.imagePressed}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Mở ảnh đính kèm"
                  >
                    <Image
                      source={{ uri: resolveMediaUrl(item.file_url) }}
                      style={[styles.image, { width: imageCellWidth, height: imageCellHeight, backgroundColor: colors.surfaceAlt }]}
                      resizeMode="cover"
                      accessibilityLabel="Ảnh đính kèm trong tin nhắn"
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!message.recalled && videoAttachments.map((item) => (
              <Pressable
                key={item.id || item.file_url}
                style={({ pressed }) => [
                  styles.videoCard,
                  { backgroundColor: mine ? colors.bubbleMineSurface : colors.surfaceAlt, borderColor: mine ? colors.bubbleMineMuted : colors.border },
                  pressed && styles.pressed,
                ]}
                onPress={() => onOpenMedia?.(message, item)}
                onLongPress={() => onLongPress?.(message, item)}
                accessibilityRole="button"
                accessibilityLabel="Mở video đính kèm"
                accessibilityHint="Nhấn giữ để mở tùy chọn video"
              >
                {item.thumbnail_url ? (
                  <Image source={{ uri: resolveMediaUrl(item.thumbnail_url) }} style={[styles.videoThumbnail, { backgroundColor: colors.surfaceAlt }]} resizeMode="cover" />
                ) : null}
                <View style={[styles.videoPlay, { backgroundColor: colors.overlay }]}>
                  <Ionicons name="play" size={iconSize.md} color={colors.onPrimary} />
                </View>
                <View style={styles.videoCopy}>
                  <Text style={[styles.fileName, { color: mine ? colors.bubbleMineText : colors.text }]} numberOfLines={1}>{getFileName(item.file_url)}</Text>
                  <Text style={[styles.fileMeta, { color: mine ? colors.bubbleMineMuted : colors.textMuted }]}>{formatFileSize(item.size)}</Text>
                </View>
              </Pressable>
            ))}

            {!message.recalled && voiceAttachments.map((item) => (
              <VoiceMessagePlayer
                key={item.id || item.file_url}
                messageId={message.id}
                attachment={item}
                mine={mine}
                activeVoiceId={activeVoiceId}
                onRequestPlay={onVoicePlaybackChange}
                onLongPress={() => onLongPress?.(message, item)}
              />
            ))}

            {!message.recalled && fileAttachments.map((item) => (
              <Pressable
                key={item.id || item.file_url}
                style={({ pressed }) => [
                  styles.fileCard,
                  {
                    backgroundColor: mine ? colors.bubbleMineSurface : colors.surfaceAlt,
                    borderColor: mine ? colors.bubbleMineMuted : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => Linking.openURL(resolveMediaUrl(item.file_url)).catch(() => {})}
                onLongPress={() => onLongPress?.(message, item)}
                accessibilityRole="link"
                accessibilityLabel={`Mở tệp ${getFileName(item.file_url)}`}
              >
                <View style={[styles.fileIcon, { backgroundColor: mine ? colors.bubbleMineText : colors.primarySoft }]}>
                  <Ionicons name="document-text" size={iconSize.md} color={colors.primary} />
                </View>
                <View style={styles.fileCopy}>
                  <Text style={[styles.fileName, { color: mine ? colors.bubbleMineText : colors.text }]} numberOfLines={1}>{getFileName(item.file_url)}</Text>
                  <Text style={[styles.fileMeta, { color: mine ? colors.bubbleMineMuted : colors.textMuted }]}>{formatFileSize(item.size)}</Text>
                </View>
                <Ionicons name="open-outline" size={iconSize.sm} color={mine ? colors.bubbleMineMuted : colors.textMuted} />
              </Pressable>
            ))}

            {message.recalled ? (
              <View style={styles.recalledRow}>
                <Ionicons name="ban-outline" size={iconSize.xs} color={mine ? colors.bubbleMineMuted : colors.textMuted} />
                <Text style={[styles.content, styles.recalled, { color: mine ? colors.bubbleMineMuted : colors.textMuted }]}>Tin nhắn đã được thu hồi</Text>
              </View>
            ) : null}

            {!message.recalled && hasText ? <Text style={[styles.content, { color: mine ? colors.bubbleMineText : colors.text }]}>{message.content}</Text> : null}

            {showMeta ? (
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: mine ? colors.bubbleMineMuted : colors.textMuted }]}>{message.edited ? 'đã sửa · ' : ''}{formatTime(message.created_at)}</Text>
                {mine ? <Ionicons name={statusIcon} size={iconSize.xs} color={status === 'failed' ? colors.danger : colors.bubbleMineMuted} style={styles.statusIcon} /> : null}
              </View>
            ) : null}
          </View>
        </Pressable>

        {mine && showStatus ? (
          <Pressable onPress={status === 'failed' ? onRetry : undefined} accessibilityRole={status === 'failed' ? 'button' : undefined}>
            <Text style={[styles.status, { color: status === 'failed' ? colors.danger : colors.textMuted }]}>{statusLabel}{status === 'failed' ? ' · Chạm để gửi lại' : ''}</Text>
          </Pressable>
        ) : null}

        {reactions.length > 0 ? (
          <Animated.View entering={ZoomIn.duration(motion.fast)} style={[styles.reactions, mine ? styles.mineReactions : styles.theirReactions, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            {reactions.map((item) => <Ionicons key={item.id || `${item.user_id}-${item.type}`} name={reactionIcons[item.type] || 'ellipse'} size={iconSize.xs} color={colors.primary} />)}
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageRow: { width: '100%', flexDirection: 'row', paddingHorizontal: spacing.md },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  clusterTight: { marginBottom: spacing.xxs },
  clusterEnd: { marginBottom: spacing.sm },
  avatarSlot: { width: 32, justifyContent: 'flex-end', marginRight: spacing.sm },
  messageColumn: { flexShrink: 1 },
  mineColumn: { alignItems: 'flex-end' },
  theirColumn: { alignItems: 'flex-start' },
  sender: { maxWidth: 220, fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, marginBottom: spacing.xs, marginLeft: spacing.sm },
  pressTarget: { maxWidth: '100%' },
  bubble: { maxWidth: '100%', borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mineSingle: { borderRadius: radius.lg, borderBottomRightRadius: radius.xs },
  theirSingle: { borderRadius: radius.lg, borderBottomLeftRadius: radius.xs },
  mineFirst: { borderRadius: radius.lg, borderBottomRightRadius: radius.sm },
  mineMiddle: { borderRadius: radius.lg, borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
  mineLast: { borderRadius: radius.lg, borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.xs },
  theirFirst: { borderRadius: radius.lg, borderBottomLeftRadius: radius.sm },
  theirMiddle: { borderRadius: radius.lg, borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
  theirLast: { borderRadius: radius.lg, borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.xs },
  content: { fontFamily: typography.family.body, fontSize: typography.size.body, lineHeight: typography.lineHeight.body },
  recalledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recalled: { fontStyle: 'italic' },
  reply: { borderLeftWidth: 3, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  replySender: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  replyText: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginTop: spacing.xxs },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  image: { borderRadius: radius.md },
  imagePressed: { opacity: componentState.mutedOpacity, transform: [{ scale: componentState.pressedScale }] },
  videoCard: { minWidth: 220, maxWidth: 300, minHeight: 76, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm, position: 'relative' },
  videoThumbnail: { width: 82, height: 76 },
  videoPlay: { position: 'absolute', left: 24, top: 20, width: 36, height: 36, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  videoCopy: { flex: 1, marginHorizontal: spacing.md },
  fileCard: { minWidth: 220, maxWidth: 300, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  fileIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  fileCopy: { flex: 1, marginHorizontal: spacing.sm },
  fileName: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  fileMeta: { fontFamily: typography.family.mono, fontSize: typography.size.micro, marginTop: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.xs },
  meta: { fontFamily: typography.family.mono, fontSize: typography.size.micro, lineHeight: typography.lineHeight.micro },
  statusIcon: { marginLeft: spacing.xs },
  status: { fontFamily: typography.family.body, fontSize: typography.size.micro, lineHeight: typography.lineHeight.micro, fontWeight: typography.weight.semibold, marginTop: spacing.xs, marginHorizontal: spacing.xs },
  reactions: { marginTop: -spacing.xs, borderRadius: radius.round, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, flexDirection: 'row', gap: spacing.xs },
  mineReactions: { marginRight: spacing.sm },
  theirReactions: { marginLeft: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xxl, marginVertical: spacing.xl },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, marginHorizontal: spacing.md },
  systemRow: { alignItems: 'center', paddingHorizontal: spacing.xxl, marginVertical: spacing.md },
  systemText: { overflow: 'hidden', borderRadius: radius.round, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, textAlign: 'center' },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
