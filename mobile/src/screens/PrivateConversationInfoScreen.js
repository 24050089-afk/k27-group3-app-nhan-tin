import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import SettingsRow from '../components/SettingsRow';
import useConversationDetails from '../hooks/useConversationDetails';
import useSocketStatus from '../hooks/useSocketStatus';
import { getConversationMediaApi, updateConversationSettingsApi } from '../api/conversation.api';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { spacing, typography } from '../theme/tokens';

export default function PrivateConversationInfoScreen(props) {
  const { user } = useAuth();
  return <PrivateConversationInfoContent key={`${user?.id}:${props.route.params.conversationId}`} {...props} />;
}

function PrivateConversationInfoContent({ route, navigation }) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const connected = useSocketStatus();
  const details = useConversationDetails(conversationId);
  const conversation = details.data;
  const me = conversation?.members?.find((member) => String(member.user_id) === String(user?.id));
  const person = conversation?.members?.find((member) => String(member.user_id) !== String(user?.id))?.user;
  const [counts, setCounts] = useState(null);
  const [countError, setCountError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const alive = useRef(true);
  const flight = useRef(false);
  const countGeneration = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const loadCounts = useCallback(async () => {
    const request = ++countGeneration.current;
    try {
      const response = await getConversationMediaApi(conversationId, { type: 'image', page: 1, limit: 1 });
      if (request !== countGeneration.current) return;
      setCounts(response.data.counts);
      setCountError('');
    } catch (error) {
      if (request === countGeneration.current) {
        setCountError(error.message || 'Chưa tải được số ảnh và video.');
        if ([401, 403, 404].includes(error.status)) setCounts(null);
      }
    }
  }, [conversationId]);
  useFocusEffect(useCallback(() => {
    loadCounts();
    return () => { countGeneration.current += 1; };
  }, [loadCounts]));

  const toggle = async (key) => {
    if (flight.current || !connected || !details.verified || !me) return;
    flight.current = true;
    setBusy(true);
    setMessage('');
    try {
      await updateConversationSettingsApi(conversationId, { [key]: !me[key] });
      if (alive.current) await details.refresh();
    } catch (error) {
      if (alive.current) setMessage(error.message || 'Chưa cập nhật được cài đặt.');
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const text = { color: colors.text, fontFamily: typography.family.body };
  if (!conversation) return <View style={[styles.center, { backgroundColor: colors.background }]}>
    {details.loading ? <ActivityIndicator color={colors.primary} /> : <><Text style={text}>{details.error?.message || 'Không tìm thấy cuộc trò chuyện.'}</Text><Button title="Thử lại" onPress={() => details.refresh().catch(() => {})} /></>}
  </View>;
  if (conversation.type !== 'private' || !person) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={text}>Không tìm thấy thông tin người trò chuyện.</Text></View>;

  const seen = person.last_seen_at ? new Date(person.last_seen_at) : null;
  const status = person.is_online ? 'Đang hoạt động' : seen && !Number.isNaN(seen.getTime()) ? `Hoạt động lần cuối ${seen.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Ngoại tuyến';
  const disabled = busy || !connected || !details.verified;
  const openMedia = (type) => navigation.navigate('SharedMedia', { conversationId, type });
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
    <View style={styles.identity}>
      <Avatar user={{ ...person, avatar: resolveMediaUrl(person.avatar) }} size={96} showStatus />
      <Text style={[styles.name, text]}>{person.name || person.username || 'Người dùng'}</Text>
      <Text style={[styles.status, { color: colors.textMuted }]}>{status}</Text>
      <Button title="Nhắn tin" variant="outline" onPress={() => navigation.navigate('Chat', { conversationId })} />
    </View>
    {person.username || person.phone ? <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.primary }]}>THÔNG TIN</Text>
      {person.username ? <SettingsRow icon="at-outline" label={person.username} description="Tên người dùng" first last={!person.phone} /> : null}
      {person.phone ? <SettingsRow icon="call-outline" label={person.phone} description="Số điện thoại" first={!person.username} last /> : null}
    </View> : null}
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.primary }]}>NỘI DUNG ĐÃ CHIA SẺ</Text>
      <SettingsRow icon="images-outline" label="Ảnh" value={counts ? String(counts.images) : '…'} onPress={() => openMedia('image')} first />
      <SettingsRow icon="videocam-outline" label="Video" value={counts ? String(counts.videos) : '…'} onPress={() => openMedia('video')} last />
      {countError ? <><Text accessibilityRole="alert" style={[styles.note, text]}>{countError}</Text><Button title="Tải lại số lượng" variant="ghost" onPress={loadCounts} /></> : null}
    </View>
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.primary }]}>CÀI ĐẶT CỦA BẠN</Text>
      <SettingsRow icon="notifications-off-outline" label="Tắt thông báo" disabled={disabled} onPress={() => toggle('muted')} accessibilityLabel={`Tắt thông báo, ${me?.muted ? 'đang bật' : 'đang tắt'}`} trailing={<View pointerEvents="none"><Switch value={!!me?.muted} disabled={disabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} /></View>} first />
      <SettingsRow icon="pin-outline" label="Ghim cuộc trò chuyện" disabled={disabled} onPress={() => toggle('pinned')} accessibilityLabel={`Ghim cuộc trò chuyện, ${me?.pinned ? 'đang bật' : 'đang tắt'}`} trailing={<View pointerEvents="none"><Switch value={!!me?.pinned} disabled={disabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceRaised} /></View>} last />
    </View>
    {!connected ? <Text style={[styles.note, { color: colors.textMuted }]}>Bạn đang ngoại tuyến. Kết nối lại để cập nhật cài đặt.</Text> : null}
    {details.error ? <Button title="Tải lại thông tin" variant="outline" onPress={() => details.refresh().catch(() => {})} /> : null}
    {message ? <Text accessibilityRole="alert" style={[styles.note, text]}>{message}</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.lg },
  identity: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  name: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  status: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  section: { marginTop: spacing.xl },
  heading: { fontFamily: typography.family.body, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.md },
  note: { marginVertical: spacing.md, fontSize: 14, lineHeight: 20 },
});
