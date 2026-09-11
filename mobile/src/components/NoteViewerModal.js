import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ErrorState from './ErrorState';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function NoteViewerModal({
  visible,
  note,
  isMine,
  onClose,
  onReply,
  onDelete,
  loading,
  error,
}) {
  const { colors } = useTheme();
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!visible) setReply('');
  }, [visible]);

  if (!note) return null;

  const content = [note.emoji, note.text].filter(Boolean).join(' ');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isMine ? 'Tin ghi chú của bạn' : note.authorName}
      description={isMine ? `${note.viewCount || 0} lượt xem` : 'Trả lời nhanh bằng tin nhắn riêng.'}
      dismissDisabled={loading}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.noteCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.text }]}>{content}</Text>
          <Text style={[styles.expiry, { color: colors.textMuted }]}>Tự biến mất sau 24 giờ</Text>
        </View>

        {isMine ? (
          <Button title="Xoá tin ghi chú" icon="trash-outline" variant="danger" onPress={() => onDelete(note)} loading={loading} />
        ) : (
          <>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Trả lời tin ghi chú"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.replyInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              accessibilityLabel="Trả lời tin ghi chú"
            />
            <Button
              title="Gửi trả lời"
              icon="send"
              onPress={() => onReply(note, reply)}
              loading={loading}
              disabled={!reply.trim()}
            />
          </>
        )}
        {error ? <ErrorState compact title="Thao tác chưa thành công" message={error} /> : null}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  noteCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  noteText: { fontFamily: typography.family.display, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.heavy },
  expiry: { fontFamily: typography.family.body, fontSize: typography.size.caption, marginTop: spacing.sm },
  replyInput: { minHeight: 84, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input, textAlignVertical: 'top', marginBottom: spacing.md },
});
