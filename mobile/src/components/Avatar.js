import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnlineIndicator from './OnlineIndicator';
import { useTheme } from '../store/ThemeContext';
import { iconSize, radius, spacing, typography } from '../theme/tokens';

export default function Avatar({ user, size = 48, showStatus = false, variant = 'person' }) {
  const { colors } = useTheme();
  const name = user?.name || user?.username || '?';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const cornerRadius = variant === 'group' ? Math.round(size * 0.34) : Math.max(radius.md, Math.round(size * 0.25));
  const avatarStyle = { width: size, height: size, borderRadius: cornerRadius };
  const statusSize = Math.max(11, Math.round(size * 0.27));

  return (
    <View style={[styles.container, avatarStyle]}>
      {user?.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, avatarStyle]}
          resizeMode="cover"
          accessibilityLabel={`Ảnh đại diện của ${name}`}
        />
      ) : variant === 'group' ? (
        <View
          style={[
            styles.avatar,
            styles.fallback,
            { backgroundColor: colors.infoSoft, borderColor: colors.border },
            avatarStyle,
          ]}
          accessibilityLabel={`Ảnh nhóm mặc định của ${name}`}
        >
          <Ionicons name="people" size={Math.max(iconSize.md, size * 0.42)} color={colors.info} />
        </View>
      ) : (
        <View
          style={[
            styles.avatar,
            styles.fallback,
            { backgroundColor: colors.primarySoft, borderColor: colors.border },
            avatarStyle,
          ]}
          accessibilityLabel={`Ảnh đại diện mặc định của ${name}`}
        >
          <Text style={[styles.initial, { color: colors.primary, fontSize: Math.max(14, size * 0.36) }]}>{initial}</Text>
        </View>
      )}
      {showStatus && variant === 'person' ? <View style={styles.status}><OnlineIndicator online={!!user?.is_online} size={statusSize} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  avatar: { borderWidth: 1 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: typography.family.display, fontWeight: typography.weight.heavy },
  status: { position: 'absolute', right: -spacing.xxs, bottom: -spacing.xxs },
});
