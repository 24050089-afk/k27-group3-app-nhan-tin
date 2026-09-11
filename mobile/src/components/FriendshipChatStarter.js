import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function FriendshipChatStarter({ friend, onComposeGreeting }) {
  const { colors } = useTheme();
  const name = friend?.name || friend?.username || 'người bạn mới';

  return (
    <View style={styles.container} accessibilityRole="summary">
      <Avatar user={friend} size={64} showStatus />
      <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="people" size={iconSize.sm} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Bạn và {name} đã là bạn bè</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>Cuộc trò chuyện đã sẵn sàng. Hãy gửi một lời chào để bắt đầu.</Text>
      <Pressable
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: colors.primarySoft },
          pressed && styles.pressed,
        ]}
        onPress={onComposeGreeting}
        accessibilityRole="button"
        accessibilityLabel={`Soạn lời chào cho ${name}`}
      >
        <Ionicons name="hand-left-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={[styles.actionText, { color: colors.primary }]}>Soạn lời chào</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', alignSelf: 'center', maxWidth: 320, paddingHorizontal: spacing.xl },
  iconBadge: { width: 32, height: 32, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', marginTop: -18, marginLeft: 46 },
  title: { marginTop: spacing.lg, textAlign: 'center', fontFamily: typography.family.display, fontSize: typography.size.titleSmall, lineHeight: typography.lineHeight.titleSmall, fontWeight: typography.weight.bold },
  description: { marginTop: spacing.sm, textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall },
  action: { minHeight: touchTarget.default, marginTop: spacing.lg, borderRadius: radius.round, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  actionText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
