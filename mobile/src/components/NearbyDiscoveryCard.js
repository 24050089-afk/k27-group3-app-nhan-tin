import React from 'react';
import { StyleSheet } from 'react-native';
import Button from './Button';
import { spacing } from '../theme/tokens';

export default function NearbyDiscoveryCard({
  status,
  loading = false,
  error = '',
  onStart,
  onRetry,
  onOpenSettings,
}) {
  const active = Boolean(status?.active);
  const permanentlyDenied = status?.permission === 'denied_permanently';

  const handlePress = () => {
    if (permanentlyDenied) {
      onOpenSettings?.();
      return;
    }
    if (active || error) {
      onRetry?.();
      return;
    }
    onStart?.();
  };

  return (
    <Button
      title="Gợi ý bạn gần đây"
      compact
      onPress={handlePress}
      loading={loading}
      disabled={loading}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
});
