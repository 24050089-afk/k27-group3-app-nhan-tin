import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getConversationsApi, updateConversationSettingsApi } from '../api/conversation.api';
import { getSocket } from '../api/socket';
import AppHeader from '../components/AppHeader';
import BottomSheet from '../components/BottomSheet';
import ConnectionBanner from '../components/ConnectionBanner';
import ConversationRow, { getConversationPresentation } from '../components/ConversationRow';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import NotesTray from '../components/NotesTray';
import SearchBar from '../components/SearchBar';
import SettingsRow from '../components/SettingsRow';
import useSocketStatus from '../hooks/useSocketStatus';
import { useAuth } from '../store/AuthContext';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';
import { getHiddenMessageSet } from '../utils/hiddenMessages';
import { radius, spacing } from '../theme/tokens';

const SOCKET_SYNC_DEBOUNCE_MS = 200;

const hydrateConversationVisibility = async (items, ownerUserId) => Promise.all(
  items.map(async (conversation) => {
    const lastId = conversation.last_message?.id;
    if (lastId === null || lastId === undefined) {
      return { ...conversation, locally_hidden_last: false };
    }
    try {
      const hiddenIds = await getHiddenMessageSet(ownerUserId, conversation.id);
      return { ...conversation, locally_hidden_last: hiddenIds.has(String(lastId)) };
    } catch {
      return { ...conversation, locally_hidden_last: false };
    }
  })
);

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { layout } = useDevice();
  const { colors } = useTheme();
  const connected = useSocketStatus();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [sheetError, setSheetError] = useState('');
  const [updating, setUpdating] = useState(false);
  const mountedRef = useRef(false);
  const latestUserIdRef = useRef(user?.id);
  const previousUserIdRef = useRef(user?.id);
  const conversationsRef = useRef([]);
  const syncInFlightRef = useRef(null);
  const syncQueuedRef = useRef(false);
  const syncSurfaceErrorRef = useRef(false);
  const syncSequenceRef = useRef(0);
  const committedSequenceRef = useRef(0);
  const socketDebounceTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      syncQueuedRef.current = false;
      if (socketDebounceTimerRef.current) clearTimeout(socketDebounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const nextUserId = user?.id;
    latestUserIdRef.current = nextUserId;
    if (String(previousUserIdRef.current ?? '') !== String(nextUserId ?? '')) {
      previousUserIdRef.current = nextUserId;
      const invalidationSequence = syncSequenceRef.current + 1;
      syncSequenceRef.current = invalidationSequence;
      committedSequenceRef.current = invalidationSequence;
      syncQueuedRef.current = true;
      conversationsRef.current = [];
      setConversations([]);
      setSelectedConversation(null);
      setError('');
      setLoading(true);
      if (socketDebounceTimerRef.current) clearTimeout(socketDebounceTimerRef.current);
    }
  }, [user?.id]);

  const requestConversationSync = useCallback(({
    showRefreshing = false,
    surfaceError = false,
  } = {}) => {
    if (!latestUserIdRef.current) return Promise.resolve();
    if (showRefreshing && mountedRef.current) setRefreshing(true);
    if (surfaceError) syncSurfaceErrorRef.current = true;

    if (syncInFlightRef.current) {
      syncQueuedRef.current = true;
      return syncInFlightRef.current;
    }

    const run = async () => {
      try {
        do {
          syncQueuedRef.current = false;
          const shouldSurfaceError = syncSurfaceErrorRef.current;
          syncSurfaceErrorRef.current = false;
          const ownerUserId = latestUserIdRef.current;
          const sequence = syncSequenceRef.current + 1;
          syncSequenceRef.current = sequence;

          try {
            const res = await getConversationsApi();
            const hydrated = await hydrateConversationVisibility(res.data || [], ownerUserId);
            const sameUser = String(latestUserIdRef.current ?? '') === String(ownerUserId ?? '');
            if (!mountedRef.current || !sameUser || sequence < committedSequenceRef.current) continue;

            conversationsRef.current = hydrated;
            committedSequenceRef.current = sequence;
            setConversations(hydrated);
            setSelectedConversation((current) => {
              if (!current) return null;
              return hydrated.find((item) => String(item.id) === String(current.id)) || null;
            });
            setError('');
          } catch (syncError) {
            const sameUser = String(latestUserIdRef.current ?? '') === String(ownerUserId ?? '');
            if (mountedRef.current && sameUser && shouldSurfaceError) {
              setError(syncError.message || 'Không thể tải cuộc trò chuyện.');
            }
          }
        } while (mountedRef.current && syncQueuedRef.current);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const promise = run().finally(() => {
      if (syncInFlightRef.current === promise) syncInFlightRef.current = null;
    });
    syncInFlightRef.current = promise;
    return promise;
  }, []);

  useFocusEffect(useCallback(() => {
    requestConversationSync({ surfaceError: conversationsRef.current.length === 0 });
  }, [requestConversationSync]));

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return undefined;

    const handleConversationUpdated = ({ conversationId } = {}) => {
      const normalizedId = Number(conversationId);
      if (!Number.isFinite(normalizedId) || normalizedId <= 0) return;
      if (socketDebounceTimerRef.current) clearTimeout(socketDebounceTimerRef.current);
      socketDebounceTimerRef.current = setTimeout(() => {
        socketDebounceTimerRef.current = null;
        requestConversationSync();
      }, SOCKET_SYNC_DEBOUNCE_MS);
    };
    const handleReconnect = () => requestConversationSync();

    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('connect', handleReconnect);
    return () => {
      if (socketDebounceTimerRef.current) clearTimeout(socketDebounceTimerRef.current);
      socketDebounceTimerRef.current = null;
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('connect', handleReconnect);
    };
  }, [requestConversationSync, user?.id]);

  const presented = useMemo(() => conversations.map((conversation) => ({
    conversation,
    presentation: getConversationPresentation(conversation, user?.id),
  })), [conversations, user?.id]);

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    return presented.filter(({ conversation, presentation }) => {
      if (!normalized) return true;
      const searchable = [
        presentation.title,
        presentation.preview,
        conversation.last_message?.sender?.name,
      ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
      return searchable.includes(normalized);
    }).map((item) => item.conversation);
  }, [presented, query]);

  const onRefresh = () => {
    requestConversationSync({ showRefreshing: true, surfaceError: true });
  };

  const handleNotesChanged = useCallback(() => {
    requestConversationSync();
  }, [requestConversationSync]);

  const openConversationMenu = (conversation) => {
    setSelectedConversation(conversation);
    setSheetError('');
  };

  const closeConversationMenu = () => {
    if (updating) return;
    setSelectedConversation(null);
    setSheetError('');
  };

  const updateSetting = async (patch) => {
    if (!selectedConversation || updating) return;
    setUpdating(true);
    setSheetError('');
    try {
      await updateConversationSettingsApi(selectedConversation.id, patch);
      setSelectedConversation((current) => current ? { ...current, me: { ...current.me, ...patch } } : null);
      await requestConversationSync();
    } catch (err) {
      setSheetError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const selectedPresentation = selectedConversation
    ? getConversationPresentation(selectedConversation, user?.id)
    : null;

  const emptyTitle = query ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Proxy"
        showAvatar={false}
        actions={[{
          icon: 'notifications-outline',
          label: 'Mở trung tâm thông báo',
          onPress: () => navigation.navigate('NotificationCenter'),
        }, {
          icon: 'create-outline',
          label: 'Tạo tin nhắn mới',
          onPress: () => navigation.navigate('NewChat'),
          primary: true,
        }]}
      >
        <SearchBar value={query} onChangeText={setQuery} placeholder="Tìm cuộc trò chuyện" accessibilityLabel="Tìm cuộc trò chuyện" />
      </AppHeader>
      <ConnectionBanner connected={connected} />

      {loading ? (
        <LoadingState count={7} />
      ) : error && conversations.length === 0 ? (
        <View style={styles.fillState}><ErrorState title="Không tải được cuộc trò chuyện" message={error} onRetry={() => requestConversationSync({ surfaceError: true })} /></View>
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              currentUserId={user?.id}
              onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
              onLongPress={() => openConversationMenu(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={(
            <View>
              {error ? <ErrorState compact title="Không cập nhật được danh sách" message={error} onRetry={() => requestConversationSync({ surfaceError: true })} /> : null}
              <NotesTray navigation={navigation} onChanged={handleNotesChanged} />
            </View>
          )}
          contentContainerStyle={[
            styles.list,
            visibleConversations.length === 0 && styles.emptyList,
            { paddingBottom: layout.contentPaddingBottom },
          ]}
          ListEmptyComponent={(
            <EmptyState
              icon={query ? 'search-outline' : 'chatbubbles-outline'}
              title={emptyTitle}
              description={query ? 'Thử tên hoặc nội dung tin nhắn gần nhất.' : 'Tạo một cuộc trò chuyện mới để bắt đầu.'}
              actionLabel={!query ? 'Tin nhắn mới' : undefined}
              onAction={!query ? () => navigation.navigate('NewChat') : undefined}
            />
          )}
        />
      )}

      <BottomSheet
        visible={!!selectedConversation}
        onClose={closeConversationMenu}
        title={selectedPresentation?.title}
        description="Tùy chọn chỉ áp dụng cho tài khoản của bạn."
      >
        {sheetError ? <ErrorState compact title="Không cập nhật được" message={sheetError} /> : null}
        <View style={styles.sheetRows}>
          <SettingsRow
            icon={selectedConversation?.me?.pinned ? 'pin-outline' : 'pin'}
            label={selectedConversation?.me?.pinned ? 'Bỏ ghim cuộc trò chuyện' : 'Ghim lên đầu danh sách'}
            description="Giữ cuộc trò chuyện quan trọng ở vị trí dễ thấy."
            onPress={() => updateSetting({ pinned: !selectedConversation?.me?.pinned })}
            first
            disabled={updating}
          />
          <SettingsRow
            icon={selectedConversation?.me?.muted ? 'notifications-outline' : 'notifications-off-outline'}
            label={selectedConversation?.me?.muted ? 'Bật thông báo' : 'Tắt thông báo'}
            description="Bạn vẫn nhận được tin nhắn trong cuộc trò chuyện."
            onPress={() => updateSetting({ muted: !selectedConversation?.me?.muted })}
            last
            disabled={updating}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingTop: spacing.sm },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  fillState: { flex: 1, justifyContent: 'center' },
  sheetRows: { overflow: 'hidden', borderRadius: radius.lg },
});
