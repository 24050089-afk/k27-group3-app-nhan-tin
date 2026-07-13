import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFriendRequestsApi,
  getFriendsApi,
  respondFriendRequestApi,
  searchUsersApi,
  sendFriendRequestApi,
} from '../api/social.api';
import UserListItem from '../components/UserListItem';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';

export default function FriendsScreen() {
  const { layout } = useDevice();
  const { colors } = useTheme();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        getFriendsApi(),
        getFriendRequestsApi(),
      ]);
      setFriends(friendsRes.data || []);
      setRequests(requestsRes.data || []);
    } catch (err) {
      Alert.alert('Không tải được danh sách bạn bè', `${err.message}\n\nKiểm tra kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doSearch = async () => {
    try {
      setLoading(true);
      const res = await searchUsersApi({ search });
      setResults(res.data || []);
    } catch (err) {
      Alert.alert('Không thể tìm kiếm', `${err.message}\n\nKiểm tra kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const data = useMemo(() => {
    if (tab === 'friends') return friends;
    if (tab === 'requests') return requests;
    return results;
  }, [tab, friends, requests, results]);

  const renderItem = ({ item }) => {
    if (tab === 'requests') {
      return (
        <UserListItem
          user={item.requester}
          subtitle="Đang chờ bạn phản hồi"
          actionTitle="Chấp nhận"
          onAction={() => respondFriendRequestApi(item.id, 'accepted').then(load).catch((err) => Alert.alert('Không thể chấp nhận', err.message))}
        />
      );
    }
    if (tab === 'search') {
      return (
        <UserListItem
          user={item}
          subtitle={item.email}
          actionTitle="Kết bạn"
          onAction={() => sendFriendRequestApi(item.id).then(() => Alert.alert('Đã gửi lời mời', 'Người này sẽ thấy lời mời trong danh sách chờ.')).catch((err) => Alert.alert('Không thể gửi lời mời', err.message))}
        />
      );
    }
    return <UserListItem user={item} subtitle={item.email || item.phone || item.username} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: layout.safeTop + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Bạn bè</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Liên hệ và lời mời</Text>
          </View>
        </View>
        <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]}>
          {[
            ['friends', 'Bạn bè'],
            ['requests', `Lời mời (${requests.length})`],
            ['search', 'Tìm kiếm'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && { backgroundColor: colors.surface }]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, { color: colors.textMuted }, tab === key && { color: colors.primary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'search' && (
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tên, email hoặc số điện thoại"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              returnKeyType="search"
              onSubmitEditing={doSearch}
              accessibilityLabel="Tìm người dùng"
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={doSearch}
              disabled={!search.trim()}
              accessibilityRole="button"
              accessibilityLabel="Tìm kiếm"
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[
            data.length === 0 && styles.emptyList,
            { paddingBottom: layout.contentPaddingBottom },
          ]}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Ionicons name={tab === 'search' ? 'search-outline' : 'people-outline'} size={34} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {tab === 'search' ? 'Chưa có kết quả' : tab === 'requests' ? 'Không có lời mời mới' : 'Chưa có bạn bè'}
              </Text>
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {tab === 'search' ? 'Nhập tên, email hoặc số điện thoại để tìm.' : 'Danh sách sẽ cập nhật khi có thay đổi.'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 12, marginTop: 1 },
  tabs: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', marginTop: 12 },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchButton: { marginLeft: 8, width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  empty: { textAlign: 'center', lineHeight: 19 },
});
