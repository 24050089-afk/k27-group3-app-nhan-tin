import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { componentState, motion, radius, spacing } from '../theme/tokens';

function SkeletonBlock({ style, animatedStyle, color }) {
  return <Animated.View style={[styles.block, { backgroundColor: color }, style, animatedStyle]} />;
}

export default function LoadingState({ variant = 'conversation', count = 6 }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(componentState.skeletonMinOpacity)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: componentState.skeletonMaxOpacity, duration: motion.slow, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: componentState.skeletonMinOpacity, duration: motion.slow, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const animatedStyle = { opacity };

  if (variant === 'message') {
    return (
      <View style={styles.messageList} accessibilityLabel="Đang tải tin nhắn">
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonBlock
            key={String(index)}
            color={colors.skeleton}
            animatedStyle={animatedStyle}
            style={[styles.message, index % 3 === 1 ? styles.messageMine : styles.messageTheir, index % 2 === 0 && styles.messageWide]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list} accessibilityLabel="Đang tải danh sách">
      {Array.from({ length: count }).map((_, index) => (
        <View key={String(index)} style={styles.row}>
          <SkeletonBlock color={colors.skeleton} animatedStyle={animatedStyle} style={styles.avatar} />
          <View style={styles.copy}>
            <SkeletonBlock color={colors.skeleton} animatedStyle={animatedStyle} style={[styles.line, styles.lineTitle]} />
            <SkeletonBlock color={colors.skeleton} animatedStyle={animatedStyle} style={[styles.line, index % 2 ? styles.lineShort : styles.lineLong]} />
          </View>
          <SkeletonBlock color={colors.skeleton} animatedStyle={animatedStyle} style={styles.time} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.sm },
  list: { paddingTop: spacing.sm },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: radius.lg },
  copy: { flex: 1, marginLeft: spacing.md },
  line: { height: 11, marginVertical: spacing.xs },
  lineTitle: { width: '48%', height: 14 },
  lineLong: { width: '78%' },
  lineShort: { width: '58%' },
  time: { width: 34, height: 9, alignSelf: 'flex-start', marginTop: spacing.sm },
  messageList: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
  message: { width: '48%', height: 54, borderRadius: radius.lg, marginVertical: spacing.xs },
  messageWide: { width: '68%', height: 70 },
  messageMine: { alignSelf: 'flex-end' },
  messageTheir: { alignSelf: 'flex-start' },
});
