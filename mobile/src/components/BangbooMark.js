import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';

export default function BangbooMark({ size = 52, label }) {
  const { colors } = useTheme();
  const faceSize = size;
  const earSize = Math.round(size * 0.34);

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
        <View style={styles.eyeRow}>
          <View style={[styles.eye, { backgroundColor: colors.primary }]} />
          <View style={[styles.eye, { backgroundColor: colors.primary }]} />
        </View>
        <View style={[styles.mouth, { backgroundColor: colors.accent }]} />
      </View>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ears: { position: 'absolute', zIndex: 0, flexDirection: 'row', justifyContent: 'space-between' },
  ear: { borderRadius: 999, transform: [{ rotate: '18deg' }] },
  face: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  eyeRow: { flexDirection: 'row', gap: 9, marginBottom: 7 },
  eye: { width: 8, height: 13, borderRadius: 5 },
  mouth: { width: 18, height: 4, borderRadius: 2 },
  label: { marginTop: 6, fontSize: 11, fontWeight: '900', letterSpacing: 0 },
});
