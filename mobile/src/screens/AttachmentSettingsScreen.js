import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import SectionHeader from '../components/SectionHeader';
import SettingsRow from '../components/SettingsRow';
import { useTheme } from '../store/ThemeContext';
import { clearAttachmentCache, formatStorageSize, getAttachmentCacheInfo } from '../utils/attachmentCache';
import { layout, spacing, typography } from '../theme/tokens';

export default function AttachmentSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const nextInfo = await getAttachmentCacheInfo();
      if (request === generation.current) setInfo(nextInfo);
    } catch (cause) {
      if (request === generation.current) setError(cause.message || 'Không thể đọc bộ nhớ tệp đính kèm.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load().catch(() => {});
    return () => { generation.current += 1; };
  }, [load]));

  const clear = async () => {
    if (clearing || !info?.files) return;
    const request = ++generation.current;
    setClearing(true);
    setError('');
    try {
      const nextInfo = await clearAttachmentCache();
      if (request === generation.current) setInfo(nextInfo);
    } catch (cause) {
      if (request === generation.current) setError(cause.message || 'Không thể dọn bộ nhớ tạm.');
    } finally {
      if (request === generation.current) setClearing(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <SectionHeader title="Bộ nhớ" />
      {loading && !info ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
      {info ? (
        <View style={styles.section}>
          <SettingsRow icon="hourglass-outline" label="Tệp tải tạm" value={`${info.files} · ${formatStorageSize(info.bytes)}`} first />
          {info.activeDownloads ? <SettingsRow icon="cloud-download-outline" label="Đang tải" value={`${info.activeDownloads}`} /> : null}
          <SettingsRow icon="phone-portrait-outline" label="Dung lượng trống" value={formatStorageSize(info.availableBytes)} last />
        </View>
      ) : null}
      {error ? <ErrorState title="Không đọc được bộ nhớ" message={error} onRetry={load} compact /> : null}
      <Button title="Dọn bộ nhớ tạm" icon="trash-outline" variant="outline" disabled={!info?.files || clearing || Boolean(info?.activeDownloads)} loading={clearing} onPress={clear} />
      <Text style={[styles.note, { color: colors.textMuted }]}>Chỉ xóa tệp tải dở trong cache. Ảnh và video đã lưu trong thư viện thiết bị không bị ảnh hưởng.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.lg },
  section: { marginBottom: spacing.xl },
  loading: { marginVertical: spacing.xxl },
  note: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.md },
});
