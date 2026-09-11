import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import ProxyMark from './ProxyMark';
import KeyboardScreen from './KeyboardScreen';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../store/ThemeContext';
import { layout, motion, radius, spacing, typography } from '../theme/tokens';

export default function AuthLayout({ title, description, children, footer, compact = false }) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: motion.slow, useNativeDriver: true }).start();
  }, [progress]);

  const animatedStyle = {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <KeyboardScreen style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screen} extraBottomSpace={spacing.xxxl}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <ProxyMark size={40} />
          <Text style={[styles.brandName, { color: colors.text }]}>Proxy</Text>
        </View>
        <ThemeToggle compact />
      </View>

      <View style={[styles.visual, compact && styles.visualCompact]} pointerEvents="none">
        <View style={[styles.orbitLarge, { borderColor: colors.divider }]} />
        <View style={[styles.orbitSmall, { backgroundColor: colors.primarySoft }]} />
        <View style={[styles.mark, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <ProxyMark size={68} />
        </View>
      </View>

      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        </View>
        <View style={styles.form}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, width: '100%', maxWidth: layout.authMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.xxl },
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, fontWeight: typography.weight.heavy, letterSpacing: -0.3, marginLeft: spacing.md },
  visual: { height: 184, position: 'relative', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', marginTop: spacing.sm },
  visualCompact: { height: 132 },
  orbitLarge: { position: 'absolute', width: 178, height: 178, right: -48, borderRadius: radius.round, borderWidth: 1 },
  orbitSmall: { position: 'absolute', width: 88, height: 88, right: 84, bottom: 18, borderRadius: radius.round },
  mark: { width: 104, height: 104, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xl },
  content: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.sm },
  heading: { marginBottom: spacing.xxl },
  title: { maxWidth: layout.authMaxWidth, fontFamily: typography.family.display, fontSize: typography.size.display, lineHeight: typography.lineHeight.display, fontWeight: typography.weight.heavy, letterSpacing: -1.4 },
  description: { maxWidth: 390, fontFamily: typography.family.body, fontSize: typography.size.body, lineHeight: typography.lineHeight.body, marginTop: spacing.md },
  form: { width: '100%' },
  footer: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
});
