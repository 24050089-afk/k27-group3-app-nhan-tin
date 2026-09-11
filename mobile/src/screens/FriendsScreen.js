import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFriendRequestsApi,
  getFriendsApi,
  getNearbyStatusApi,
  getRecentFriendSuggestionsApi,
  respondFriendRequestApi,
  searchNearbyUsersApi,
  searchUsersApi,
  sendFriendRequestApi,
  startNearbySessionApi,
} from '../api/social.api';
import { createPrivateConversationApi } from '../api/conversation.api';
import AppHeader from '../components/AppHeader';
import ConnectionBanner from '../components/ConnectionBanner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import NearbyDiscoveryCard from '../components/NearbyDiscoveryCard';
import SearchBar from '../components/SearchBar';
import SectionHeader from '../components/SectionHeader';
import UserListItem from '../components/UserListItem';
import ToastMessage from '../components/ToastMessage';
import { getSocket } from '../api/socket';
import useSocketStatus from '../hooks/useSocketStatus';
import { useAuth } from '../store/AuthContext';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';
import { layout as layoutTokens, radius, spacing, typography } from '../theme/tokens';

const tabs = [
  { key: 'friends', label: 'Danh bạ' },
  { key: 'requests', label: 'Lời mời' },
  { key: 'search', label: 'Tìm người' },
];

function alphabetSections(items) {
  const buckets = items.reduce((acc, item) => {
    const first = (item?.name || item?.username || '#').trim().charAt(0).toLocaleUpperCase('vi-VN');
    const key = /[A-ZÀ-Ỹ]/i.test(first) ? first : '#';
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});
  return Object.keys(buckets).sort((a, b) => a.localeCompare(b, 'vi-VN')).map((title) => ({
    title,
    data: buckets[title].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi-VN')),
  }));
}

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const { layout } = useDevice();
  const { colors } = useTheme();
  const connected = useSocketStatus();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [nearbyStatus, setNearbyStatus] = useState({ active: false, permission: 'unknown' });
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const acceptingIdsRef = useRef(new Set());
  const nearbyIntentRef = useRef(0);

  const load = useCallback(async () => {
    setError('');
    try {
      const [friendsRes, requestsRes] = await Promise.all([getFriendsApi(), getFriendRequestsApi()]);
      setFriends(friendsRes.data || []);
      setRequests(requestsRes.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh bạ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadDiscovery = useCallback(async () => {
    if (!user?.id) return;
    setNearbyError('');
    try {
      const suggestionsRes = await getRecentFriendSuggestionsApi({ limit: 10 });
      setSuggestions((suggestionsRes.data || []).map((item) => ({ ...item.user, ...item })));
      const permissionRes = await Location.getForegroundPermissionsAsync();
      const permission = permissionRes.status === 'granted'
        ? 'granted'
        : permissionRes.canAskAgain === false ? 'denied_permanently' : 'undetermined';
      const servicesEnabled = permission === 'granted' ? await Location.hasServicesEnabledAsync() : true;
      let statusRes = null;
      try {
        statusRes = permission === 'granted' && servicesEnabled ? await getNearbyStatusApi() : null;
      } catch (statusError) {
        setNearbyError(statusError.message || 'Không thể tải trạng thái tìm người ở gần.');
      }
      setNearbyStatus({
        ...(statusRes?.data || { active: false }),
        permission: servicesEnabled ? permission : 'services_disabled',
      });
    } catch (err) {
      setNearbyError(err.message || 'Không thể tải gợi ý kết nối.');
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    loadDiscovery();
  }, [load, loadDiscovery]));

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const handleAccepted = () => load();
    socket.on('friendship:accepted', handleAccepted);
    return () => socket.off('friendship:accepted', handleAccepted);
  }, [load]);

  const getCurrentLocationPayload = async () => {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy_m: Math.max(1, Math.round(location.coords.accuracy || 1)),
    };
  };

  const fetchNearbyResults = async (payload) => {
    const response = await searchNearbyUsersApi(payload);
    setNearbyResults((response.data || []).map((item) => ({ ...item.user, ...item })));
  };

  const startNearby = async () => {
    const intent = nearbyIntentRef.current + 1;
    nearbyIntentRef.current = intent;
    setNearbyLoading(true);
    setNearbyError('');
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (intent !== nearbyIntentRef.current) return;
      if (permission.status !== 'granted') {
        setNearbyStatus((current) => ({
          ...current,
          active: false,
          permission: permission.canAskAgain === false ? 'denied_permanently' : 'denied',
        }));
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setNearbyStatus((current) => ({ ...current, active: false, permission: 'services_disabled' }));
        return;
      }
      const payload = await getCurrentLocationPayload();
      if (intent !== nearbyIntentRef.current) return;
      const session = await startNearbySessionApi(payload);
      if (intent !== nearbyIntentRef.current) return;
      await fetchNearbyResults(payload);
      setNearbyStatus({ ...(session.data || {}), active: true, permission: 'granted' });
    } catch (err) {
      if (intent === nearbyIntentRef.current) setNearbyError(err.message || 'Không thể tìm người ở gần.');
    } finally {
      if (intent === nearbyIntentRef.current) setNearbyLoading(false);
    }
  };

  const refreshNearby = async () => {
    if (!nearbyStatus.active) return startNearby();
    setNearbyLoading(true);
    setNearbyError('');
    try {
      const payload = await getCurrentLocationPayload();
      await fetchNearbyResults(payload);
      const statusRes = await getNearbyStatusApi();
      setNearbyStatus((current) => ({ ...current, ...(statusRes.data || {}) }));
    } catch (err) {
      setNearbyError(err.message || 'Không thể cập nhật người ở gần.');
    } finally {
      setNearbyLoading(false);
    }
  };

  const doSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      await loadDiscovery();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await searchUsersApi({ search: search.trim() });
      setResults((res.data || []).filter((item) => item.id !== user?.id));
    } catch (err) {
      setError(err.message || 'Không thể tìm người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (id, action, successMessage) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      if (successMessage) Alert.alert('Đã hoàn tất', successMessage);
      await load();
      if (tab === 'search') await loadDiscovery();
    } catch (err) {
      setError(err.message || 'Không thể hoàn tất thao tác.');
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (friendId) => {
    setBusyId(friendId);
    setError('');
    try {
      const res = await createPrivateConversationApi(friendId);
      navigation.navigate('Chat', { conversationId: res.data.id });
    } catch (err) {
      setError(err.message || 'Không thể mở cuộc trò chuyện.');
    } finally {
      setBusyId(null);
    }
  };

  const acceptFriendRequest = async (request) => {
    const requestKey = String(request.id);
    if (acceptingIdsRef.current.has(requestKey)) return;
    acceptingIdsRef.current.add(requestKey);
    setBusyId(request.id);
    setError('');
    try {
      const response = await respondFriendRequestApi(request.id, 'accepted');
      const conversationId = response.conversation_id;
      const friendName = response.friend?.name || request.requester?.name || 'người bạn mới';
      setToast({
        message: `Đã kết bạn với ${friendName}`,
        conversationId,
      });
      await load();
    } catch (err) {
      setError(err.message || 'Không thể chấp nhận lời mời kết bạn.');
    } finally {
      acceptingIdsRef.current.delete(requestKey);
      setBusyId(null);
    }
  };

  const discoveryItems = useMemo(() => [
    ...(nearbyResults.length ? nearbyResults.map((item) => ({ ...item, discoveryType: 'nearby' })) : []),
    ...(suggestions.length ? suggestions.map((item) => ({ ...item, discoveryType: 'suggestion' })) : []),
  ], [nearbyResults, suggestions]);
  const visibleItems = tab === 'friends'
    ? friends
    : tab === 'requests'
      ? requests
      : search.trim() ? results : discoveryItems;
  const sections = useMemo(() => {
    if (tab === 'friends') return alphabetSections(friends);
    if (tab === 'requests') return [{ title: 'Đang chờ phản hồi', data: visibleItems }];
    if (search.trim()) return [{ title: 'Kết quả người dùng', data: visibleItems }];
    return [
      ...(nearbyResults.length ? [{ title: 'Ở gần bạn', data: nearbyResults.map((item) => ({ ...item.user, ...item, discoveryType: 'nearby' })) }] : []),
      ...(suggestions.length ? [{ title: 'Gợi ý cho bạn', data: suggestions.map((item) => ({ ...item.user, ...item, discoveryType: 'suggestion' })) }] : []),
    ];
  }, [friends, tab, visibleItems, search, nearbyResults, suggestions]);

  const emptyCopy = tab === 'friends'
    ? { icon: 'people-outline', title: 'Danh bạ đang trống', description: 'Tìm người dùng để gửi lời mời kết bạn và bắt đầu trò chuyện.' }
    : tab === 'requests'
      ? { icon: 'mail-open-outline', title: 'Không có lời mời mới', description: 'Các lời mời đang chờ sẽ xuất hiện tại đây.' }
      : { icon: 'search-outline', title: search ? 'Không tìm thấy người phù hợp' : 'Chưa có gợi ý phù hợp', description: 'Tìm theo tên, username hoặc UID để kết nối với người bạn biết.' };

  const renderPersonRow = (item, index, section) => {
    const last = index === section.data.length - 1;
    const relationship = item.relationship || 'none';
    const isRejected = relationship === 'rejected';
    const actionTitle = relationship === 'accepted'
      ? 'Nhắn tin'
      : relationship === 'outgoing_pending'
        ? 'Đã gửi'
        : relationship === 'incoming_pending'
          ? 'Xem lời mời'
          : isRejected ? 'Chưa thể kết bạn' : 'Kết bạn';
    const subtitle = item.discoveryType === 'nearby'
      ? (item.distance_band === 'nearby_approximate' ? 'Ở gần · khoảng cách ước lượng' : `Ở gần · ${String(item.distance_band || '').replaceAll('_', ' ')}`)
      : item.discoveryType === 'suggestion'
        ? item.reason?.type === 'mutual_friends' ? `${item.reason.count} bạn chung` : 'Cùng nhóm trò chuyện'
        : item.username || item.uid;
    const onAction = relationship === 'accepted'
      ? () => openChat(item.id)
      : relationship === 'incoming_pending'
        ? () => setTab('requests')
        : relationship === 'none'
          ? () => runAction(item.id, () => sendFriendRequestApi(item.id), 'Lời mời kết bạn đã được gửi.')
          : undefined;
    return (
      <UserListItem
        user={item}
        subtitle={subtitle}
        actionTitle={actionTitle}
        actionIcon={relationship === 'accepted' ? 'chatbubble-ellipses-outline' : relationship === 'incoming_pending' ? 'mail-open-outline' : 'person-add-outline'}
        onAction={onAction}
        actionDisabled={relationship === 'outgoing_pending' || isRejected}
        loading={busyId === item.id}
        first={index === 0}
        last={last}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Mọi người"
        subtitle={`${friends.length} liên hệ · ${requests.length} lời mời`}
        user={user}
        actions={[
          { icon: 'scan-outline', label: 'Quét QR kết bạn', onPress: () => navigation.navigate('QrFriendScanner') },
          { icon: 'chatbubble-ellipses-outline', label: 'Tạo cuộc trò chuyện', onPress: () => navigation.navigate('NewChat'), primary: true },
        ]}
      >
        <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
          {tabs.map((item) => {
            const selected = tab === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.tab, selected && { backgroundColor: colors.surfaceRaised }]}
                onPress={() => { setTab(item.key); setError(''); }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, { color: selected ? colors.text : colors.textMuted }]}>
                  {item.label}{item.key === 'requests' && requests.length ? ` · ${requests.length}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tab === 'search' ? (
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} onSubmit={doSearch} placeholder="Tên, email hoặc số điện thoại" accessibilityLabel="Tìm người dùng" />
          </View>
        ) : null}
      </AppHeader>
      <ConnectionBanner connected={connected} />

      {loading ? <LoadingState variant="conversation" count={6} /> : error ? (
        <ErrorState message={error} onRetry={tab === 'search' ? doSearch : load} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            load();
            if (tab === 'search' && !search.trim()) refreshNearby();
          }} tintColor={colors.primary} />}
          contentContainerStyle={[
            styles.list,
            visibleItems.length === 0 && !(tab === 'search' && !search.trim()) && styles.emptyList,
            { paddingBottom: layout.contentPaddingBottom },
          ]}
          renderSectionHeader={({ section }) => visibleItems.length ? <SectionHeader title={section.title} /> : null}
          ListHeaderComponent={tab === 'search' && !search.trim() ? (
            <NearbyDiscoveryCard
              status={nearbyStatus}
              loading={nearbyLoading}
              error={nearbyError}
              onStart={startNearby}
              onRetry={refreshNearby}
              onOpenSettings={() => Linking.openSettings()}
            />
          ) : null}
          renderItem={({ item, index, section }) => {
            const last = index === section.data.length - 1;
            if (tab === 'requests') {
              const requester = item.requester;
              return (
                <UserListItem
                  user={requester}
                  subtitle="Muốn kết nối với bạn"
                  actionTitle="Chấp nhận"
                  actionIcon="checkmark"
                  onAction={() => acceptFriendRequest(item)}
                  loading={busyId === item.id}
                  first={index === 0}
                  last={last}
                />
              );
            }
            if (tab === 'search') {
              return renderPersonRow(item, index, section);
            }
            return (
              <UserListItem
                user={item}
                subtitle={item.is_online ? 'Đang hoạt động' : item.email || item.phone || item.username}
                onPress={() => openChat(item.id)}
                first={index === 0}
                last={last}
              />
            );
          }}
          ListEmptyComponent={(
            <EmptyState
              {...emptyCopy}
              compact={tab === 'search' && !search.trim()}
              actionLabel={tab === 'friends' ? 'Tìm người dùng' : undefined}
              onAction={tab === 'friends' ? () => setTab('search') : undefined}
            />
          )}
        />
      )}
      <ToastMessage
        message={toast?.message}
        actionLabel={toast?.conversationId ? 'Nhắn tin' : undefined}
        onAction={toast?.conversationId ? () => {
          const conversationId = toast.conversationId;
          setToast(null);
          navigation.navigate('Chat', { conversationId });
        } : undefined}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs },
  tab: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  tabText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  searchWrap: { marginTop: spacing.md },
  list: { paddingHorizontal: layoutTokens.screenPadding, paddingTop: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
