import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroupConversationApi, createPrivateConversationApi } from '../api/conversation.api';
import { getFriendsApi } from '../api/social.api';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Input from '../components/Input';
import LoadingState from '../components/LoadingState';
import SearchBar from '../components/SearchBar';
import SectionHeader from '../components/SectionHeader';
import UserListItem from '../components/UserListItem';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';
import { iconSize, layout as layoutTokens, radius, spacing, typography } from '../theme/tokens';

export default function NewChatScreen({ navigation }) {
  const { layout } = useDevice();
  const { colors } = useTheme();
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFriendsApi();
      setFriends(res.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách bạn bè.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    if (!query) return friends;
    return friends.filter((item) => [item.name, item.email, item.phone, item.username]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('vi-VN').includes(query)));
  }, [friends, search]);

  const selectedUsers = useMemo(
    () => selected.map((id) => friends.find((item) => item.id === id)).filter(Boolean),
    [friends, selected],
  );

  const toggle = (id) => {
    setError('');
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const startPrivate = async (friendId) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await createPrivateConversationApi(friendId);
      navigation.replace('Chat', { conversationId: res.data.id });
    } catch (err) {
      setError(err.message || 'Không thể tạo cuộc trò chuyện.');
    } finally {
      setSubmitting(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError('Hãy đặt tên để mọi người nhận biết cuộc trò chuyện.');
      return;
    }
    if (selected.length < 2) {
      setError('Chọn ít nhất 2 người để tạo nhóm.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await createGroupConversationApi({ name: groupName.trim(), member_ids: selected });
      navigation.replace('Chat', { conversationId: res.data.id });
    } catch (err) {
      setError(err.message || 'Không thể tạo nhóm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={[styles.planner, { borderBottomColor: colors.divider }]}>
        <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
          {[
            { group: false, label: 'Cá nhân', icon: 'person-outline' },
            { group: true, label: 'Nhóm', icon: 'people-outline' },
          ].map((item) => {
            const active = groupMode === item.group;
            return (
              <Pressable
                key={item.label}
                style={[styles.mode, active && { backgroundColor: colors.surfaceRaised }]}
                onPress={() => { setGroupMode(item.group); setError(''); }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={item.icon} size={iconSize.sm} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.modeText, { color: active ? colors.text : colors.textMuted }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {groupMode ? (
          <>
            <Input
              label="Tên nhóm"
              value={groupName}
              onChangeText={(value) => { setGroupName(value); setError(''); }}
              placeholder="Ví dụ: Nhóm dự án"
              icon="people-outline"
              maxLength={120}
            />
            {selectedUsers.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedList} keyboardShouldPersistTaps="handled">
                {selectedUsers.map((item) => (
                  <Pressable key={item.id} style={[styles.personChip, { backgroundColor: colors.surfaceAlt }]} onPress={() => toggle(item.id)} accessibilityLabel={`Bỏ chọn ${item.name}`}>
                    <Avatar user={item} size={30} />
                    <Text style={[styles.personChipText, { color: colors.text }]} numberOfLines={1}>{item.name || item.username}</Text>
                    <Ionicons name="close" size={iconSize.xs} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        <SearchBar value={search} onChangeText={setSearch} placeholder="Lọc trong danh bạ" accessibilityLabel="Tìm bạn bè" />
        {error && friends.length > 0 ? <ErrorState title="Chưa thể tiếp tục" message={error} compact /> : null}
      </View>

      {loading ? <LoadingState variant="conversation" count={5} /> : error && friends.length === 0 ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: layout.contentPaddingBottom + (groupMode ? 84 : 0) }]}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length ? <SectionHeader title={groupMode ? `Chọn thành viên · ${selected.length}` : 'Danh bạ'} description={groupMode ? 'Cần ít nhất hai người' : 'Chạm một liên hệ để mở trò chuyện'} /> : null}
          {filtered.map((item, index) => {
            const picked = selected.includes(item.id);
            return (
              <UserListItem
                key={item.id}
                user={item}
                subtitle={picked ? 'Đã chọn vào nhóm' : item.is_online ? 'Đang hoạt động' : item.email}
                onPress={() => groupMode ? toggle(item.id) : startPrivate(item.id)}
                actionTitle={groupMode ? (picked ? 'Đã chọn' : 'Chọn') : undefined}
                actionIcon={picked ? 'checkmark' : 'add'}
                onAction={groupMode ? () => toggle(item.id) : undefined}
                loading={!groupMode && submitting}
                selected={picked}
                first={index === 0}
                last={index === filtered.length - 1}
              />
            );
          })}
          {!filtered.length ? (
            <EmptyState
              icon={friends.length ? 'search-outline' : 'people-outline'}
              title={friends.length ? 'Không có liên hệ phù hợp' : 'Chưa có bạn bè để nhắn tin'}
              description={friends.length ? 'Thử một từ khóa khác.' : 'Hãy kết bạn trong tab Mọi người trước khi tạo cuộc trò chuyện.'}
              actionLabel={!friends.length ? 'Đến Mọi người' : undefined}
              onAction={!friends.length ? () => navigation.navigate('Main', { screen: 'Friends' }) : undefined}
            />
          ) : null}
        </ScrollView>
      )}

      {groupMode ? (
        <View style={[styles.footer, { paddingBottom: Math.max(layout.safeBottom, spacing.md), backgroundColor: colors.surfaceRaised, borderTopColor: colors.divider }]}>
          <Button
            title={selected.length >= 2 ? `Tạo nhóm với ${selected.length} người` : 'Chọn ít nhất 2 người'}
            icon="arrow-forward"
            onPress={createGroup}
            loading={submitting}
            disabled={!groupName.trim() || selected.length < 2}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  planner: { paddingHorizontal: layoutTokens.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md },
  modeSwitch: { flexDirection: 'row', padding: spacing.xs, borderRadius: radius.md },
  mode: { flex: 1, minHeight: 44, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  modeText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  selectedList: { gap: spacing.sm },
  personChip: { maxWidth: 168, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.round, paddingLeft: spacing.xs, paddingRight: spacing.md },
  personChipText: { flexShrink: 1, fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },
  list: { flex: 1 },
  listContent: { paddingHorizontal: layoutTokens.screenPadding, paddingTop: spacing.xl },
  footer: { paddingTop: spacing.md, paddingHorizontal: layoutTokens.screenPadding, borderTopWidth: StyleSheet.hairlineWidth },
});
