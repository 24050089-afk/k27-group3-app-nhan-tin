import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useDevice } from '../store/DeviceContext';

export default function KeyboardScreen({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset,
  extraBottomSpace = 24,
}) {
  const { layout } = useDevice();

  return (
    <KeyboardAvoidingView
      style={[styles.root, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset ?? 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: layout.safeBottom + extraBottomSpace },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
});
