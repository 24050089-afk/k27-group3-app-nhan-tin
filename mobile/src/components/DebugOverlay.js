import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { networkLogger } from '../utils/networkLogger';

const METHOD_COLORS = {
  GET: '#3B82F6',
  POST: '#10B981',
  PUT: '#F59E0B',
  PATCH: '#8B5CF6',
  DELETE: '#EF4444',
};

function LogItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const body = JSON.stringify(log.data, null, 2);
  const urlShort = log.url?.replace(/^https?:\/\/[^/]+/, '') || log.url || '';
  const sizeKb = (log.size / 1024).toFixed(1);

  const handleCopy = async () => {
    const text = `${log.method} ${log.url}\nStatus: ${log.status} | ${log.duration}ms | ${sizeKb}KB\n\n${body}`;
    await Clipboard.setStringAsync(text);
    Alert.alert('Đã copy!', '', [], { cancelable: true });
  };

  const statusColor = log.ok ? '#10B981' : '#EF4444';

  return (
    <View style={styles.logItem}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.logRow}>
          <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[log.method] || '#6B7280' }]}>
            <Text style={styles.methodText}>{log.method}</Text>
          </View>
          <View style={styles.logMeta}>
            <Text style={styles.logUrl} numberOfLines={1}>{urlShort}</Text>
            <View style={styles.logStats}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {log.status || 'ERR'}
              </Text>
              <Text style={styles.statText}>{log.duration}ms</Text>
              <Text style={styles.statText}>{sizeKb}KB</Text>
            </View>
          </View>
          <Text style={styles.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.bodyWrapper}>
          <ScrollView horizontal style={styles.bodyScroll} nestedScrollEnabled>
            <Text style={styles.bodyText}>{body}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyText}>⎘  Sao chép</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function DebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState(() => (__DEV__ ? networkLogger.getLogs() : []));

  useEffect(() => {
    if (!__DEV__) return;
    return networkLogger.subscribe(setLogs);
  }, []);

  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)}>
        <Text style={styles.fabText}>API</Text>
        {logs.length > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{logs.length > 99 ? '99+' : logs.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Network  ({logs.length})</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => networkLogger.clear()}
              >
                <Text style={styles.headerBtnText}>Xóa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, styles.closeBtn]}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LogItem log={item} />}
            ListEmptyComponent={
              <Text style={styles.empty}>Chưa có request nào</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'rgba(17,24,39,0.88)',
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 8,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    zIndex: 9999,
    elevation: 10,
  },
  fabText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fabBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  fabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  modal: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  headerBtnText: { color: '#94A3B8', fontSize: 13 },
  closeBtn: { backgroundColor: '#1E3A5F' },
  closeBtnText: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },

  empty: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 80,
    fontSize: 14,
  },

  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    minWidth: 56,
    alignItems: 'center',
  },
  methodText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  logMeta: { flex: 1 },
  logUrl: { color: '#CBD5E1', fontSize: 13 },
  logStats: { flexDirection: 'row', gap: 10, marginTop: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  statText: { color: '#475569', fontSize: 12 },
  arrow: { color: '#334155', fontSize: 12 },

  bodyWrapper: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#060A14',
    overflow: 'hidden',
  },
  bodyScroll: { maxHeight: 220, padding: 12 },
  bodyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  copyBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  copyText: { color: '#60A5FA', fontSize: 13, fontWeight: '600' },
});
