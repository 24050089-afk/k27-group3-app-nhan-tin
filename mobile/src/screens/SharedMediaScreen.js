import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ImageViewer from '../components/ImageViewer';
import { getConversationMediaApi } from '../api/conversation.api';
import { getSocket } from '../api/socket';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { getHiddenMessageSet } from '../utils/hiddenMessages';
import { spacing, typography } from '../theme/tokens';

export default function SharedMediaScreen(props) {
  const { user } = useAuth();
  return <SharedMediaContent key={`${user?.id}:${props.route.params.conversationId}:${props.route.params.type}`} {...props} />;
}

function SharedMediaContent({ route }) {
  const { user } = useAuth();
  const { conversationId } = route.params;
  const type = route.params.type === 'video' ? 'video' : 'image';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const generation = useRef(0);
  const flight = useRef(false);
  const focused = useRef(false);

  const load = useCallback(async (reset = false) => {
    if (!focused.current || (flight.current && !reset)) return;
    const request = ++generation.current;
    const nextPage = reset ? 1 : page.current + 1;
    flight.current = true;
    setLoading(true);
    setError('');
    if (reset) {
      setViewer(null);
      setItems([]);
      setHasMore(false);
      page.current = 0;
    }
    try {
      const [response, hidden] = await Promise.all([
        getConversationMediaApi(conversationId, { type, page: nextPage, limit: 30 }),
        getHiddenMessageSet(user?.id, conversationId),
      ]);
      if (request !== generation.current) return;
      const data = response.data;
      setItems((current) => {
        const merged = reset ? [] : current;
        const ids = new Set(merged.map((item) => String(item.id)));
        return [...merged.filter((item) => !hidden.has(String(item.message_id))), ...data.items.filter((item) => !ids.has(String(item.id)) && !hidden.has(String(item.message_id)))];
      });
      page.current = nextPage;
      setHasMore(data.has_more === true);
    } catch (err) {
      if (request !== generation.current) return;
      setError(err.message || 'Chưa tải được nội dung đã chia sẻ.');
      if ([401, 403, 404].includes(err.status)) {
        setItems([]);
        setViewer(null);
        setHasMore(false);
        page.current = 0;
      }
    } finally {
      if (request === generation.current) {
        flight.current = false;
        setLoading(false);
      }
    }
  }, [conversationId, type, user?.id]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    let timer;
    const socket = getSocket();
    const reload = () => {
      socket?.emit('conversation:join', { conversationId });
      load(true);
    };
    const changed = (event) => {
      if (String(event?.conversationId) !== String(conversationId)) return;
      clearTimeout(timer);
      timer = setTimeout(reload, 100);
    };
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
      else setViewer(null);
    });
    reload();
    socket?.on('connect', reload);
    socket?.on('conversation:updated', changed);
    socket?.on('message:updated', changed);
    return () => {
      focused.current = false;
      generation.current += 1;
      flight.current = false;
      clearTimeout(timer);
      socket?.off('connect', reload);
      socket?.off('conversation:updated', changed);
      socket?.off('message:updated', changed);
      // Chat stays mounted below this screen and owns the shared room lifetime.
      // Leaving here would unsubscribe Chat from later message updates.
      appSubscription.remove();
      setViewer(null);
    };
  }, [conversationId, load]));

  const open = async (item) => {
    const uri = resolveMediaUrl(item.file_url);
    if (!uri) return;
    if (type === 'image') { setViewer(uri); return; }
    const request = generation.current;
    try { await Linking.openURL(uri); }
    catch {
      if (focused.current && request === generation.current) setError('Không thể mở video. Vui lòng thử lại.');
    }
  };
  const textStyle = { color: colors.text, fontFamily: typography.family.body };
  const footer = <View style={styles.footer}>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <><Text accessibilityRole="alert" style={[styles.note, textStyle]}>{error}</Text><Button title="Thử lại" variant="outline" onPress={() => load(page.current === 0)} /></> : null}
    {!loading && !error && hasMore ? <Button title="Tải thêm" variant="outline" onPress={() => load()} /> : null}
  </View>;
  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      numColumns={3}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
      columnWrapperStyle={styles.row}
      refreshing={loading && items.length === 0}
      onRefresh={() => load(true)}
      ListEmptyComponent={!loading && !error ? <Text style={[styles.empty, textStyle]}>{hasMore ? 'Chưa có nội dung hiển thị ở trang này. Nhấn Tải thêm để xem nội dung cũ hơn.' : type === 'video' ? 'Không có video để hiển thị.' : 'Không có ảnh để hiển thị.'}</Text> : null}
      ListFooterComponent={footer}
      renderItem={({ item, index }) => <Pressable
        onPress={() => open(item)}
        style={({ pressed }) => [styles.tile, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${type === 'video' ? 'Mở video' : 'Mở ảnh'} ${index + 1}`}
        accessibilityHint={type === 'video' ? 'Mở trình phát trên thiết bị' : 'Xem toàn màn hình'}
      >
        {type === 'image' || item.thumbnail_url ? <Image source={{ uri: resolveMediaUrl(type === 'image' ? item.file_url : item.thumbnail_url) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {type === 'video' ? <><Ionicons name="play-circle" size={36} color={colors.primary} /><Text style={[styles.videoLabel, textStyle]}>{item.size ? `${(item.size / 1024 / 1024).toFixed(1)} MB` : 'Video'}</Text></> : null}
      </Pressable>}
    />
    <ImageViewer visible={!!viewer} uri={viewer} onClose={() => setViewer(null)} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.sm },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  tile: { width: '31.8%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 48 },
  videoLabel: { fontSize: 12, marginTop: spacing.xs },
  footer: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center', padding: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
});
