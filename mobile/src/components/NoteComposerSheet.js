import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import Button from './Button';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import UserListItem from './UserListItem';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

const MAX_NOTE_LENGTH = 60;

export default function NoteComposerSheet({
  visible,
  onClose,
  onSubmit,
  friends = [],
  loadingFriends = false,
  error,
  submitting,
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('ALL_FRIENDS');
  const [selectedIds, setSelectedIds] = useState([]);

  const length = useMemo(() => Array.from(text).length, [text]);
  const canSubmit = length > 0 && length <= MAX_NOTE_LENGTH && !submitting && (
    audience === 'ALL_FRIENDS' || selectedIds.length > 0
  );

  const close = () => {
    if (submitting) return;
    setText('');
    setAudience('ALL_FRIENDS');
    setSelectedIds([]);
    onClose();
  };

  const toggleFriend = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const submit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      text: text.trim(),
      audience,
      custom_audience_ids: audience === 'CUSTOM' ? selectedIds : null,
    });
    setText('');
    setAudience('ALL_FRIENDS');
    setSelectedIds([]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Tin ghi chú mới"
      description="Bạn bè sẽ thấy tin này trong 24 giờ."
      dismissDisabled={submitting}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.editor, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Bạn đang nghĩ gì?"
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_NOTE_LENGTH}
            multiline
            autoFocus
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Nội dung tin ghi chú"
          />
          <Text style={[styles.counter, { color: length > MAX_NOTE_LENGTH ? colors.danger : colors.textMuted }]}>
            {length}/{MAX_NOTE_LENGTH}
          </Text>
        </View>

        <View style={styles.audienceSwitch} accessibilityRole="tablist">
          {[
            { key: 'ALL_FRIENDS', label: 'Tất cả bạn bè', icon: 'people-outline' },
            { key: 'CUSTOM', label: 'Tuỳ chỉnh', icon: 'options-outline' },
          ].map((item) => {
            const active = audience === item.key;
            return (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.audienceOption,
                  { backgroundColor: active ? colors.text : colors.surfaceAlt },
                  pressed && styles.pressed,
                ]}
                onPress={() => setAudience(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={item.icon} size={iconSize.sm} color={active ? colors.background : colors.textMuted} />
                <Text style={[styles.audienceText, { color: active ? colors.background : colors.textMuted }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {audience === 'CUSTOM' ? (
          <View style={[styles.friendPicker, { borderColor: colors.divider }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ai được xem</Text>
            {loadingFriends ? <Text style={[styles.helper, { color: colors.textMuted }]}>Đang tải danh sách bạn bè...</Text> : null}
            {!loadingFriends && friends.length === 0 ? (
              <EmptyState compact icon="people-outline" title="Chưa có bạn bè" description="Hãy chọn tất cả bạn bè hoặc kết bạn trước." />
            ) : (
              <ScrollView style={styles.friendList} keyboardShouldPersistTaps="handled">
                {friends.map((friend, index) => {
                  const selected = selectedIds.includes(friend.id);
                  return (
                    <UserListItem
                      key={friend.id}
                      user={friend}
                      subtitle={selected ? 'Sẽ thấy tin này' : friend.email}
                      actionIcon={selected ? 'checkmark' : 'add'}
                      actionTitle={selected ? 'Đã chọn' : 'Chọn'}
                      onPress={() => toggleFriend(friend.id)}
                      onAction={() => toggleFriend(friend.id)}
                      selected={selected}
                      first={index === 0}
                      last={index === friends.length - 1}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {error ? <ErrorState compact title="Chưa đăng được" message={error} /> : null}
        <View style={styles.actions}>
          <Button title="Huỷ" variant="outline" onPress={close} disabled={submitting} />
          <Button title="Đăng" icon="send" onPress={submit} loading={submitting} disabled={!canSubmit} />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  editor: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, minHeight: 118 },
  input: { minHeight: 76, fontFamily: typography.family.body, fontSize: typography.size.titleSmall, lineHeight: typography.lineHeight.titleSmall, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontFamily: typography.family.mono, fontSize: typography.size.caption, marginTop: spacing.xs },
  audienceSwitch: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  audienceOption: { flex: 1, minHeight: touchTarget.default, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  audienceText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  friendPicker: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, paddingTop: spacing.md, maxHeight: 300 },
  sectionTitle: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, fontWeight: typography.weight.heavy, marginBottom: spacing.sm },
  helper: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, marginBottom: spacing.sm },
  friendList: { maxHeight: 240 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
