import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';
import Button from './Button';
import { useTheme } from '../store/ThemeContext';

export default function UserListItem({ user, subtitle, actionTitle, onAction, onPress, loading }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <Avatar user={user} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{user?.name || user?.username || 'Người dùng'}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle || user?.username || user?.email || user?.phone || 'Người dùng'}
        </Text>
      </View>
      {actionTitle && (
        <Button
          title={actionTitle}
          onPress={onAction}
          loading={loading}
          style={styles.action}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 68,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  content: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 3 },
  action: { height: 36, paddingHorizontal: 12, borderRadius: 10 },
});
