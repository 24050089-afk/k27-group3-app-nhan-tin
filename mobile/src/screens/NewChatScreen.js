import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroupConversationApi, createPrivateConversationApi } from '../api/conversation.api';
import { getFriendsApi } from '../api/social.api';
import Button from '../components/Button';
import UserListItem from '../components/UserListItem';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';

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

  const load = useCallback(async () => {
    try {
      const res = await getFriendsApi();
      setFriends(res.data || []);
    } catch (err) {
      Alert.alert('Không tải được bạn bè', `${err.message}\n\nKiểm tra kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((item) =>
      [item.name, item.email, item.phone, item.username].filter(Boolean).some((value) =>
        String(value).toLowerCase().includes(q)
      )
    );
  }, [friends, search]);

  const toggle = (id) => {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const startPrivate = async (friendId) => {
    setSubmitting(true);
    try {
      const res = await createPrivateConversationApi(friendId);
      navigation.replace('Chat', { conversationId: res.data.id });
    } catch (err) {
      Alert.alert('Không tạo được cuộc trò chuyện', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Thiếu tên nhóm', 'Nhập tên để mọi người nhận biết cuộc trò chuyện.');
      return;
    }
    if (selected.length < 2) {
      Alert.alert('Chưa đủ thành viên', 'Chọn ít nhất 2 người để tạo nhóm.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createGroupConversationApi({ name: groupName.trim(), member_ids: selected });
      navigation.replace('Chat', { conversationId: res.data.id });
    } catch (err) {
      Alert.alert('Không tạo được nhóm', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            style={[styles.segmentItem, !groupMode && { backgroundColor: colors.surface }]}
            onPress={() => setGroupMode(false)}
          >
            <Ionicons name="person-outline" size={17} color={!groupMode ? colors.primary : colors.textMuted} />
            <Text style={[styles.segmentText, { color: colors.textMuted }, !groupMode && { color: colors.primary }]}>Cá nhân</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, groupMode && { backgroundColor: colors.surface }]}
            onPress={() => setGroupMode(true)}
          >
            <Ionicons name="people-outline" size={17} color={groupMode ? colors.primary : colors.textMuted} />
            <Text style={[styles.segmentText, { color: colors.textMuted }, groupMode && { color: colors.primary }]}>Nhóm</Text>
          </TouchableOpacity>
        </View>
        {groupMode && (
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Tên nhóm"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          />
        )}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm bạn bè"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom + 72 }}
        renderItem={({ item }) => {
          const picked = selected.includes(item.id);
          return (
            <UserListItem
              user={item}
              subtitle={groupMode && picked ? 'Đã chọn' : item.email}
              actionTitle={groupMode ? (picked ? 'Bỏ chọn' : 'Chọn') : 'Nhắn tin'}
              onAction={() => groupMode ? toggle(item.id) : startPrivate(item.id)}
              loading={!groupMode && submitting}
            />
          );
        }}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={34} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không tìm thấy bạn bè</Text>
            <Text style={[styles.empty, { color: colors.textMuted }]}>Thử từ khóa khác hoặc kết bạn trước.</Text>
          </View>
        )}
      />

      {groupMode && (
        <View style={[styles.footer, { paddingBottom: Math.max(layout.safeBottom, 12), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Button
            title={`Tạo nhóm · ${selected.length} người`}
            icon="people"
            onPress={createGroup}
            loading={submitting}
            disabled={!groupName.trim() || selected.length < 2}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { padding: 16, borderBottomWidth: 1 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 12 },
  segmentItem: { flex: 1, height: 40, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontWeight: '700', marginLeft: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  emptyState: { alignItems: 'center', padding: 32, marginTop: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  empty: { textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
