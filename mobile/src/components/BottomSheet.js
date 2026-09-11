import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { elevation, motion, radius, spacing, typography } from '../theme/tokens';

export default function BottomSheet({ visible, onClose, title, description, children, dismissDisabled = false }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(420);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: motion.normal, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }),
    ]).start();
  }, [backdropOpacity, translateY, visible]);

  const close = () => {
    if (dismissDisabled) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 420, duration: motion.fast, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: motion.fast, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} disabled={dismissDisabled} accessibilityRole="button" accessibilityLabel="Đóng bảng tùy chọn" accessibilityState={{ disabled: dismissDisabled }} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            elevation.sheet,
            {
              backgroundColor: colors.surfaceRaised,
              shadowColor: colors.shadow,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {description ? <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text> : null}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: radius.round, alignSelf: 'center', marginBottom: spacing.lg },
  header: { paddingHorizontal: spacing.xs, paddingBottom: spacing.lg },
  title: { fontFamily: typography.family.display, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.heavy },
  description: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.xs },
});
