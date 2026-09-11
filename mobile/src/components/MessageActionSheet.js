import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { useTheme } from '../store/ThemeContext';
import { getMediaAttachments, hasServerMessageId, isPersistedMessage } from '../utils/messageActions';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

function ActionTile({ icon, label, onPress, danger = false, busy = false, disabled = false }) {
  const { colors } = useTheme();
  const inactive = disabled || busy;
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && !inactive && styles.pressed, inactive && styles.disabled]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
    >
      <View style={[styles.tileIcon, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceAlt }]}>
        {busy ? <ActivityIndicator size="small" color={danger ? colors.danger : colors.primary} /> : (
          <Ionicons name={icon} size={iconSize.md} color={danger ? colors.danger : colors.primary} />
        )}
      </View>
      <Text style={[styles.tileLabel, { color: danger ? colors.danger : colors.text }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export default function MessageActionSheet({
  visible,
  message,
  selectedAttachment,
  currentUserId,
  isAdmin = false,
  canEdit = true,
  canReact = true,
  busyAction,
  onClose,
  onReply,
  onForward,
  onCopy,
  onEdit,
  onDelete,
  onRecall,
  onReaction,
  onDownload,
  onDownloadAll,
}) {
  const { colors } = useTheme();
  const persisted = isPersistedMessage(message);
  const hasId = hasServerMessageId(message);
  const mine = Number(message?.sender_id) === Number(currentUserId);
  const hasText = !!String(message?.content || '').trim();
  const active = !!message && !message.recalled;
  const media = getMediaAttachments(message);
  const selectedMedia = selectedAttachment
    ? media.find((item) => String(item.id || item.file_url) === String(selectedAttachment.id || selectedAttachment.file_url))
    : null;
  const singleMedia = selectedAttachment
    ? selectedMedia
    : (media.length === 1 ? media[0] : null);
  const myReaction = (message?.reactions || []).find((item) => Number(item.user_id) === Number(currentUserId));
  const allBusy = !!busyAction;

  const actions = [
    persisted && active && { key: 'reply', icon: 'arrow-undo-outline', label: 'Trả lời', onPress: onReply },
    persisted && active && onForward && { key: 'forward', icon: 'arrow-redo-outline', label: 'Chuyển tiếp', onPress: onForward },
    active && hasText && { key: 'copy', icon: 'copy-outline', label: 'Sao chép', onPress: onCopy },
    singleMedia && active && onDownload && { key: 'download', icon: 'download-outline', label: 'Tải phương tiện', onPress: () => onDownload(singleMedia) },
    media.length > 1 && active && onDownloadAll && { key: 'download-all', icon: 'cloud-download-outline', label: 'Tải tất cả', onPress: () => onDownloadAll(media) },
    persisted && active && mine && hasText && canEdit && { key: 'edit', icon: 'create-outline', label: 'Chỉnh sửa', onPress: onEdit },
    hasId && { key: 'delete', icon: 'eye-off-outline', label: 'Xóa trên máy', onPress: onDelete, danger: true },
    persisted && active && (mine || isAdmin) && { key: 'recall', icon: 'trash-outline', label: 'Thu hồi', onPress: onRecall, danger: true },
  ].filter(Boolean);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissDisabled={allBusy}
      title="Tùy chọn tin nhắn"
      description={message?.sender?.name ? `Tin nhắn từ ${message.sender.name}` : undefined}
    >
      {persisted && active ? (
        <View style={[styles.reactionRow, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.reactionLabel, { color: colors.textMuted }]}>Cảm xúc</Text>
          {[
            { type: 'heart', icon: 'heart' },
            { type: 'like', icon: 'thumbs-up' },
          ].map((reaction) => {
            const selected = myReaction?.type === reaction.type;
            return (
              <Pressable
                key={reaction.type}
                style={({ pressed }) => [
                  styles.reaction,
                  { backgroundColor: selected ? colors.primarySoft : colors.surfaceRaised },
                  pressed && !allBusy && styles.pressed,
                ]}
                onPress={() => onReaction(reaction.type)}
                disabled={allBusy || (!canReact && !selected)}
                accessibilityRole="button"
                accessibilityLabel={selected ? 'Bỏ cảm xúc' : 'Thả cảm xúc'}
                accessibilityState={{ selected, disabled: allBusy || (!canReact && !selected) }}
              >
                {busyAction === `reaction:${reaction.type}` ? <ActivityIndicator size="small" color={colors.primary} /> : (
                  <Ionicons name={reaction.icon} size={iconSize.md} color={selected ? colors.primary : colors.textMuted} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.grid}>
        {actions.map(({ key, ...actionProps }) => (
          <ActionTile
            key={key}
            {...actionProps}
            busy={busyAction === key}
            disabled={allBusy && busyAction !== key}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  reactionRow: { minHeight: 56, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  reactionLabel: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold },
  reaction: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: spacing.sm },
  tile: { width: '25%', minHeight: 92, alignItems: 'center', paddingHorizontal: spacing.xs, paddingBottom: spacing.md },
  tileIcon: { width: touchTarget.default, height: touchTarget.default, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, fontWeight: typography.weight.semibold, textAlign: 'center', marginTop: spacing.sm },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
