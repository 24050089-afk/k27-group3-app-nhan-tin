import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotificationsApi, markAllNotificationsReadApi, markNotificationReadApi } from '../api/notification.api';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { useNotifications } from '../store/NotificationContext';
import { useTheme } from '../store/ThemeContext';
import { iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

const iconByCategory = { messages: 'chatbubble-ellipses-outline', social: 'people-outline', group_updates: 'people-circle-outline', system: 'information-circle-outline' };
const timeLabel = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function NotificationCenterScreen({ navigation }) {
  const { colors } = useTheme();
  const { refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await getNotificationsApi();
      setItems(response.data || []);
      await refreshUnreadCount();
    } catch (err) {
      setError(err.message || 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => { load(); }, [load]);

  const openItem = async (item) => {
    if (!item.read) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      markNotificationReadApi(item.id).then(refreshUnreadCount).catch(() => load({ refresh: true }));
    }
    if (item.conversation_id) navigation.navigate('Chat', { conversationId: item.conversation_id });
    else if (item.related_type === 'friendship') navigation.navigate('Main', { screen: 'Friends', params: { initialTab: 'requests' } });
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadApi();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      await refreshUnreadCount();
    } catch (err) {
      setError(err.message || 'Không thể đánh dấu đã đọc.');
    } finally { setMarkingAll(false); }
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => openItem(item)}
      style={({ pressed }) => [styles.row, { backgroundColor: item.read ? colors.background : colors.unread }, pressed && { backgroundColor: colors.surfacePressed }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || 'Thông báo'}, ${item.read ? 'đã đọc' : 'chưa đọc'}`}
    >
      <View style={[styles.icon, { backgroundColor: item.read ? colors.surfaceAlt : colors.primarySoft }]}>
        <Ionicons name={iconByCategory[item.category] || 'notifications-outline'} size={iconSize.md} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title || 'Thông báo'}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={2}>{item.body || item.content}</Text>
        <Text style={[styles.time, { color: colors.textSubtle }]}>{timeLabel(item.createdAt || item.created_at)}</Text>
      </View>
      {!item.read ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </Pressable>
  );

  if (loading) return <View style={[styles.screen, { backgroundColor: colors.background }]}><LoadingState count={7} /></View>;
  if (error && !items.length) return <View style={[styles.screen, { backgroundColor: colors.background }]}><ErrorState title="Không thể tải thông báo" message={error} onRetry={() => load()} /></View>;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {error ? <ErrorState title="Cập nhật chưa hoàn tất" message={error} compact onRetry={() => load({ refresh: true })} /> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="Chưa có thông báo" description="Hoạt động mới từ cuộc trò chuyện và bạn bè sẽ xuất hiện tại đây." />}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
      />
      {items.some((item) => !item.read) ? <Pressable style={[styles.markAll, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]} onPress={markAll} disabled={markingAll} accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả là đã đọc"><Text style={[styles.markAllText, { color: colors.primary }]}>{markingAll ? 'Đang cập nhật…' : 'Đọc tất cả'}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, list: { paddingVertical: spacing.sm }, emptyList: { flexGrow: 1 }, row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }, title: { fontFamily: typography.family.body, fontWeight: typography.weight.bold, fontSize: typography.size.body, lineHeight: typography.lineHeight.body }, body: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.xxs }, time: { fontFamily: typography.family.body, fontSize: typography.size.caption, marginTop: spacing.xs }, dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-start', marginTop: spacing.sm }, markAll: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, minHeight: touchTarget.compact, borderRadius: radius.round, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, justifyContent: 'center' }, markAllText: { fontFamily: typography.family.body, fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall },
});
