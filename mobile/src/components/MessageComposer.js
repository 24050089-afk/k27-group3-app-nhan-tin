import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AttachmentButton from './AttachmentButton';
import VoiceRecorderBar from './VoiceRecorderBar';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, motion, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function MessageComposer({
  value,
  onChangeText,
  onSend,
  onAttachment,
  sending = false,
  disabled = false,
  canSendText = true,
  canSendPhoto = true,
  canSendVoice = true,
  restriction,
  context,
  onCancelContext,
  error,
  onRetry,
  onFocus,
  voice,
}) {
  const { colors } = useTheme();
  const ready = !!value.trim() && !sending && !disabled && canSendText;
  const voiceActive = !!voice && voice.phase !== 'idle';
  const actionIsMic = (!value.trim() || !canSendText) && context?.type !== 'edit' && !sending;
  const actionReady = actionIsMic ? !disabled && canSendVoice : ready;
  const displayedError = voice?.error || error;
  const sendAnimation = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(actionReady ? 1 : 0.92, { duration: motion.fast }) }],
    opacity: withTiming(actionReady || sending ? 1 : 0.58, { duration: motion.fast }),
  }), [actionReady, sending]);

  return (
    <View style={styles.root}>
      {restriction ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.textMuted, paddingBottom: spacing.sm }]}>{restriction}</Text> : null}
      {context ? (
        <View style={[styles.context, { backgroundColor: colors.surfaceSubtle, borderLeftColor: colors.primary }]}>
          <View style={styles.contextCopy}>
            <Text style={[styles.contextLabel, { color: colors.primary }]}>{context.label}</Text>
            <Text style={[styles.contextTitle, { color: colors.text }]} numberOfLines={1}>{context.title}</Text>
            {context.body ? <Text style={[styles.contextBody, { color: colors.textMuted }]} numberOfLines={1}>{context.body}</Text> : null}
          </View>
          <Pressable style={styles.contextClose} onPress={onCancelContext} accessibilityRole="button" accessibilityLabel="Đóng nội dung đang chọn">
            <Ionicons name="close" size={iconSize.sm} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      {displayedError ? (
        <View style={[styles.errorRow, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={iconSize.sm} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]} numberOfLines={2}>{displayedError}</Text>
          {voice?.permissionBlocked ? (
            <Pressable onPress={voice.onOpenSettings} style={styles.retry} accessibilityRole="button" accessibilityLabel="Mở cài đặt microphone">
              <Text style={[styles.retryText, { color: colors.danger }]}>Cài đặt</Text>
            </Pressable>
          ) : onRetry ? (
            <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel="Gửi lại">
              <Text style={[styles.retryText, { color: colors.danger }]}>Gửi lại</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {voiceActive ? (
        <VoiceRecorderBar
          phase={voice.phase}
          durationMillis={voice.durationMillis}
          preview={voice.preview}
          busy={sending}
          connected={!disabled && canSendVoice}
          onStop={voice.onStop}
          onCancel={voice.onCancel}
          onSend={voice.onSend}
          playbackOwner={voice.playbackOwner}
          onPreviewPlay={voice.onPreviewPlay}
        />
      ) : <View style={styles.row}>
        <AttachmentButton onPress={onAttachment} disabled={sending || disabled || !canSendPhoto || context?.type === 'edit'} />
        <View style={[styles.inputShell, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <TextInput
            value={value}
            editable={canSendText}
            onChangeText={onChangeText}
            onFocus={onFocus}
            placeholder={context?.type === 'edit' ? 'Chỉnh sửa tin nhắn' : 'Viết tin nhắn'}
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { color: colors.text }]}
            multiline
            textAlignVertical="center"
            blurOnSubmit={false}
            accessibilityLabel="Nội dung tin nhắn"
          />
        </View>
        <Animated.View style={sendAnimation}>
          <Pressable
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: actionReady ? colors.primary : colors.surfaceAlt },
              pressed && actionReady && styles.pressed,
            ]}
            onPress={actionIsMic ? voice?.onStart : onSend}
            disabled={!actionReady}
            accessibilityRole="button"
            accessibilityLabel={actionIsMic ? 'Bắt đầu ghi âm' : context?.type === 'edit' ? 'Lưu chỉnh sửa' : 'Gửi tin nhắn'}
            accessibilityState={{ disabled: !actionReady, busy: sending }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={actionIsMic ? 'mic' : context?.type === 'edit' ? 'checkmark' : 'arrow-up'} size={iconSize.md} color={actionReady ? colors.onPrimary : colors.textSubtle} />
            )}
          </Pressable>
        </Animated.View>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  inputShell: { flex: 1, minHeight: touchTarget.compact, maxHeight: 124, borderWidth: 1, borderRadius: radius.lg, justifyContent: 'center' },
  input: { maxHeight: 120, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input },
  send: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  context: { minHeight: 58, borderLeftWidth: 3, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  contextCopy: { flex: 1 },
  contextLabel: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  contextTitle: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold, marginTop: spacing.xxs },
  contextBody: { fontFamily: typography.family.body, fontSize: typography.size.caption, marginTop: spacing.xxs },
  contextClose: { width: touchTarget.compact, height: touchTarget.compact, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.md },
  errorRow: { minHeight: 38, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  errorText: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginLeft: spacing.sm },
  retry: { minHeight: 30, justifyContent: 'center', marginLeft: spacing.sm },
  retryText: { fontFamily: typography.family.body, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
