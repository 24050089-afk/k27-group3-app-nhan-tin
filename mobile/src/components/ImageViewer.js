import React from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { iconSize, motion, radius, spacing, touchTarget } from '../theme/tokens';

export default function ImageViewer({ visible, uri, onClose, onLongPress }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng ảnh">
          <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
            <Pressable style={[styles.close, { backgroundColor: colors.surfaceRaised }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng ảnh">
              <Ionicons name="close" size={iconSize.md} color={colors.text} />
            </Pressable>
          </View>
          {uri ? (
            <Animated.View entering={ZoomIn.duration(motion.normal)} exiting={ZoomOut.duration(motion.fast)} style={styles.imageShell}>
              <Pressable
                style={styles.imageShell}
                onPress={(event) => event.stopPropagation?.()}
                onLongPress={onLongPress}
                accessibilityRole="imagebutton"
                accessibilityHint={onLongPress ? 'Nhấn giữ để mở tùy chọn ảnh' : undefined}
              >
                <Image source={{ uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Ảnh đính kèm đang mở" />
              </Pressable>
            </Animated.View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  dismissArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', right: spacing.lg, zIndex: 2 },
  close: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  imageShell: { width: '100%', height: '82%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
