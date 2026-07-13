import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getConversationsApi } from '../api/conversation.api';
import ChatListItem from '../components/ChatListItem';
import { useAuth } from '../store/AuthContext';
import { useDevice } from '../store/DeviceContext';
import { useTheme } from '../store/ThemeContext';
import BangbooMark from '../components/BangbooMark';

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { layout } = useDevice();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await getConversationsApi();
      setConversations(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: layout.safeTop + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.brandRow}>
          <BangbooMark size={42} />
          <View style={styles.brandCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Tin nhắn</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bangboo Net</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('NewChat')}
            accessibilityRole="button"
            accessibilityLabel="Tạo tin nhắn mới"
          >
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Không tải được tin nhắn</Text>
          <Text style={[styles.error, { color: colors.textMuted }]}>{error}</Text>
          <TouchableOpacity style={[styles.retry, { backgroundColor: colors.primary }]} onPress={fetchData}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ChatListItem
              conversation={item}
              currentUserId={user?.id}
              onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[
            styles.list,
            conversations.length === 0 && styles.emptyList,
            { paddingBottom: layout.contentPaddingBottom },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BangbooMark size={72} label="READY" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có cuộc trò chuyện</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tạo cuộc trò chuyện để bắt đầu nhắn tin.</Text>
              <TouchableOpacity style={[styles.emptyAction, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('NewChat')}>
                <Ionicons name="add" size={19} color="#FFFFFF" />
                <Text style={styles.emptyActionText}>Tin nhắn mới</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  brandCopy: { marginLeft: 11 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 0 },
  subtitle: { fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 5 },
  error: { textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  retry: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  list: { paddingTop: 8 },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6B7280', textAlign: 'center' },
  emptyAction: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 16, borderRadius: 10, marginTop: 18 },
  emptyActionText: { color: '#FFFFFF', fontWeight: '800', marginLeft: 7 },
});
