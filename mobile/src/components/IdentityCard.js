import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../store/ThemeContext';
import { getUidAccessibilityLabel, normalizePublicUid } from '../utils/friendQrPayload';
import { iconSize, radius, spacing, typography } from '../theme/tokens';

export default function IdentityCard({ user, compact = false }) {
  const { colors } = useTheme();
  const uid = normalizePublicUid(user?.uid);
  const displayName = user?.name || user?.username || 'Người dùng';

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
      accessible
      accessibilityLabel={`${displayName}${user?.username ? `, tên người dùng ${user.username}` : ''}, ${getUidAccessibilityLabel(uid)}`}
    >
      <View style={styles.profileRow}>
        <Avatar user={user} size={compact ? 48 : 60} />
        <View style={styles.profileCopy}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
          {user?.username ? (
            <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>@{user.username}</Text>
          ) : (
            <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>Chưa đặt tên người dùng</Text>
          )}
        </View>
      </View>

      <View style={[styles.uidRow, { borderTopColor: colors.divider }]}>
        <Ionicons name="finger-print-outline" size={iconSize.sm} color={colors.primary} />
        <View style={styles.uidCopy}>
          <Text style={[styles.uidLabel, { color: colors.textMuted }]}>UID tài khoản</Text>
          <Text
            style={[styles.uid, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            accessibilityLabel={getUidAccessibilityLabel(uid)}
          >
            {uid || 'Chưa sẵn sàng'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg },
  cardCompact: { borderRadius: radius.lg, padding: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileCopy: { flex: 1, marginLeft: spacing.md },
  name: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, lineHeight: typography.lineHeight.titleSmall, fontWeight: typography.weight.heavy },
  username: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.xxs },
  uidRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, paddingTop: spacing.md },
  uidCopy: { flex: 1, marginLeft: spacing.sm },
  uidLabel: { fontFamily: typography.family.body, fontSize: typography.size.micro, lineHeight: typography.lineHeight.micro, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.7 },
  uid: { fontFamily: typography.family.mono, fontSize: typography.size.body, lineHeight: typography.lineHeight.body, fontWeight: typography.weight.bold, letterSpacing: 0.55, marginTop: spacing.xxs },
});
