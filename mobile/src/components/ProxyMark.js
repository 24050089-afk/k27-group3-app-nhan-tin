import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { elevation, radius, spacing, typography } from '../theme/tokens';

export default function ProxyMark({ size = 52, label }) {
  const { colors } = useTheme();
  const faceSize = size;
  const earSize = Math.round(size * 0.34);
  const eyeWidth = Math.max(5, Math.round(size * 0.15));
  const eyeHeight = Math.max(8, Math.round(size * 0.25));
  const mouthWidth = Math.max(12, Math.round(size * 0.35));

  return (
    <View style={styles.wrap}>
      <View style={[styles.ears, { width: faceSize, top: -earSize * 0.22 }]}>
        <View style={[styles.ear, { width: earSize, height: earSize, backgroundColor: colors.mascotEar }]} />
        <View style={[styles.ear, { width: earSize, height: earSize, backgroundColor: colors.mascotEar }]} />
      </View>
      <View
        style={[
          styles.face,
          {
            width: faceSize,
            height: faceSize,
            borderRadius: Math.round(size * 0.32),
            backgroundColor: colors.mascotFace,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={[styles.eyeRow, { gap: Math.round(size * 0.17), marginBottom: Math.round(size * 0.13) }]}>
          <View style={[styles.eye, { width: eyeWidth, height: eyeHeight, backgroundColor: colors.primary }]} />
          <View style={[styles.eye, { width: eyeWidth, height: eyeHeight, backgroundColor: colors.primary }]} />
        </View>
        <View style={[styles.mouth, { width: mouthWidth, height: Math.max(3, Math.round(size * 0.08)), backgroundColor: colors.accent }]} />
      </View>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ears: { position: 'absolute', zIndex: 0, flexDirection: 'row', justifyContent: 'space-between' },
  ear: { borderRadius: radius.round, transform: [{ rotate: '18deg' }] },
  face: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...elevation.floating,
  },
  eyeRow: { flexDirection: 'row' },
  eye: { borderRadius: radius.round },
  mouth: { borderRadius: radius.round },
  label: { marginTop: spacing.sm, fontFamily: typography.family.display, fontSize: typography.size.caption, fontWeight: typography.weight.heavy },
});
