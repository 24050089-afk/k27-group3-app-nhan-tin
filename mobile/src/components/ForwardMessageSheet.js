import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConversationsApi } from '../api/conversation.api';
import Avatar from './Avatar';
import BottomSheet from './BottomSheet';
import Button from './Button';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';
import SearchBar from './SearchBar';
import { getConversationPresentation } from './ConversationRow';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, typography } from '../theme/tokens';

function ForwardTargetRow({ conversation, currentUserId, selected, disabled, onPress }) {
  const { colors } = useTheme();
  const presentation = getConversationPresentation(conversation, currentUserId);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfacePressed : colors.surface },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={`Chuyển tiếp tới ${presentation.title}`}
      accessibilityState={{ selected, disabled }}
    >
      <Avatar user={presentation.avatarUser} size={46} variant={presentation.isGroup ? 'group' : 'person'} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{presentation.title}</Text>
        <Text style={[styles.rowPreview, { color: colors.textMuted }]} numberOfLines={1}>{presentation.preview}</Text>
      </View>
      <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surfaceRaised }]}>
        {selected ? <Ionicons name="checkmark" size={iconSize.xs} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

export default function ForwardMessageSheet({
  visible,
  currentConversationId,
  currentUserId,
  sending = false,
  actionError,
  onClose,
  onForward,
}) {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getConversationsApi();
      setConversations((res.data || []).filter((item) => Number(item.id) !== Number(currentConversationId)));
    } catch (err) {
      setError(err.message || 'Không thể tải cuộc trò chuyện.');
    } finally {
      setLoading(false);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelectedId(null);
    load();
  }, [load, visible]);

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const presentation = getConversationPresentation(conversation, currentUserId);
      return [presentation.title, presentation.preview].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(normalized);
    });
  }, [conversations, currentUserId, query]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissDisabled={sending}
      title="Chuyển tiếp tin nhắn"
      description="Chọn một cuộc trò chuyện đích."
    >
      <SearchBar value={query} onChangeText={setQuery} placeholder="Tìm cuộc trò chuyện" accessibilityLabel="Tìm cuộc trò chuyện để chuyển tiếp" />
      {actionError ? <ErrorState compact title="Chưa thể chuyển tiếp" message={actionError} /> : null}
      <View style={styles.listShell}>
        {loading ? <LoadingState count={4} /> : error ? (
          <ErrorState compact message={error} onRetry={load} />
        ) : (
          <FlatList
            data={visibleConversations}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ForwardTargetRow
                conversation={item}
                currentUserId={currentUserId}
                selected={String(selectedId) === String(item.id)}
                disabled={sending}
                onPress={() => setSelectedId(item.id)}
              />
            )}
            ListEmptyComponent={<EmptyState compact icon="chatbubbles-outline" title={query ? 'Không tìm thấy cuộc trò chuyện' : 'Không có cuộc trò chuyện đích'} description={query ? 'Thử một từ khóa khác.' : 'Tạo thêm cuộc trò chuyện trước khi chuyển tiếp.'} />}
          />
        )}
      </View>
      <Button
        title={sending ? 'Đang chuyển tiếp' : 'Chuyển tiếp'}
        icon="arrow-redo"
        loading={sending}
        disabled={!selectedId || loading || !!error}
        onPress={() => onForward(selectedId)}
        style={styles.submit}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  listShell: { minHeight: 180, maxHeight: 280, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginBottom: spacing.xs },
  rowCopy: { flex: 1, marginHorizontal: spacing.md },
  rowTitle: { fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: typography.weight.bold },
  rowPreview: { fontFamily: typography.family.body, fontSize: typography.size.caption, marginTop: spacing.xxs },
  check: { width: 24, height: 24, borderRadius: radius.round, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: spacing.md },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
