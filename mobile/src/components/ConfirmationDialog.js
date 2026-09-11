import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { componentState, elevation, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, elevation.floating, { backgroundColor: colors.surfaceRaised, shadowColor: colors.shadow }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.button, { borderColor: colors.border }, pressed && styles.pressed]}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: danger ? colors.danger : colors.primary, borderColor: danger ? colors.danger : colors.primary },
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy: loading }}
            >
              <Text style={[styles.confirmText, { color: danger ? colors.onDanger : colors.onPrimary }]}>{loading ? 'Đang xử lý' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: { width: '100%', maxWidth: 360, borderRadius: radius.xl, padding: spacing.xxl },
  title: { fontFamily: typography.family.display, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.heavy },
  message: { fontFamily: typography.family.body, fontSize: typography.size.body, lineHeight: typography.lineHeight.body, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl },
  button: { flex: 1, minHeight: touchTarget.default, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  cancelText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  confirmText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
