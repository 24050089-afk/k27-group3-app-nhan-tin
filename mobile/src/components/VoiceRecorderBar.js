import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '--:--';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const IconButton = ({ icon, label, onPress, disabled, danger, primary }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: primary ? colors.primary : danger ? colors.dangerSoft : colors.surfaceAlt },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={iconSize.md} color={primary ? colors.onPrimary : danger ? colors.danger : colors.primary} />
    </Pressable>
  );
};

export default function VoiceRecorderBar({
  phase,
  durationMillis,
  preview,
  busy = false,
  connected = true,
  onStop,
  onCancel,
  onSend,
  playbackOwner,
  onPreviewPlay,
}) {
  const { colors } = useTheme();
  const player = useAudioPlayer(preview?.uri || null, { updateInterval: 200 });
  const playerStatus = useAudioPlayerStatus(player);
  const mountedRef = useRef(true);
  const playerRef = useRef(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const isRecording = phase === 'recording';
  const isPreparing = ['requesting_permission', 'preparing', 'stopping'].includes(phase);
  const isPreview = phase === 'preview' && !!preview;
  const totalMs = isPreview
    ? Math.max(preview.durationMillis || 0, (playerStatus.duration || 0) * 1000)
    : durationMillis;
  const currentMs = isPreview ? (playerStatus.currentTime || 0) * 1000 : durationMillis;
  const progress = totalMs > 0 ? Math.min(currentMs / totalMs, 1) : 0;

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => () => {
    mountedRef.current = false;
    playerRef.current = null;
  }, []);

  const runPlayerAction = async (action) => {
    const currentPlayer = playerRef.current;
    if (!mountedRef.current || currentPlayer !== player) return false;
    try {
      await action(currentPlayer);
      return mountedRef.current && playerRef.current === currentPlayer;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (playbackOwner && playbackOwner !== '__voice-preview__' && playerStatus.playing) {
      runPlayerAction((currentPlayer) => currentPlayer.pause());
    }
  }, [playbackOwner, player, playerStatus.playing]);

  const togglePlayback = async () => {
    if (!isPreview || busy || !playerStatus.isLoaded) return;
    if (playerStatus.playing) {
      await runPlayerAction((currentPlayer) => currentPlayer.pause());
      onPreviewPlay?.(null);
      return;
    }
    if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration)) {
      const canContinue = await runPlayerAction((currentPlayer) => currentPlayer.seekTo(0));
      if (!canContinue) return;
    }
    onPreviewPlay?.('__voice-preview__');
    await runPlayerAction((currentPlayer) => currentPlayer.play());
  };

  const seekFromPress = async (event) => {
    if (!isPreview || !playerStatus.duration || busy) return;
    const { locationX } = event.nativeEvent;
    if (!trackWidth) return;
    await runPlayerAction((currentPlayer) => currentPlayer.seekTo(
      Math.max(0, Math.min(playerStatus.duration, (locationX / trackWidth) * playerStatus.duration)),
    ));
  };

  if (isPreparing) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} accessibilityRole="progressbar">
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.statusText, { color: colors.text }]}>
          {phase === 'stopping' ? 'Đang hoàn tất bản ghi…' : 'Đang chuẩn bị microphone…'}
        </Text>
        <IconButton icon="close" label="Hủy ghi âm" onPress={onCancel} danger />
      </View>
    );
  }

  if (isRecording) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={[styles.recordDot, { backgroundColor: colors.danger }]} />
        <View style={styles.copy}>
          <Text style={[styles.statusText, { color: colors.text }]}>Đang ghi âm</Text>
          <Text style={[styles.timer, { color: colors.textMuted }]} accessibilityLabel={`Đã ghi ${formatDuration(durationMillis)}`}>{formatDuration(durationMillis)}</Text>
        </View>
        <IconButton icon="trash-outline" label="Hủy và xóa bản ghi" onPress={onCancel} danger />
        <IconButton icon="stop" label="Dừng ghi âm" onPress={onStop} primary />
      </View>
    );
  }

  if (!isPreview) return null;

  return (
    <View style={[styles.bar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <IconButton
        icon={playerStatus.playing ? 'pause' : 'play'}
        label={playerStatus.playing ? 'Tạm dừng bản ghi' : 'Nghe bản ghi'}
        onPress={togglePlayback}
        disabled={busy || !playerStatus.isLoaded}
      />
      <View style={styles.previewCopy}>
        <Pressable
          style={[styles.track, { backgroundColor: colors.border }]}
          onPress={seekFromPress}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Tiến trình bản ghi âm"
          accessibilityValue={{ min: 0, max: Math.round(totalMs / 1000), now: Math.round(currentMs / 1000) }}
        >
          <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </Pressable>
        <Text style={[styles.timer, { color: colors.textMuted }]}>{formatDuration(currentMs)} / {formatDuration(totalMs)}</Text>
      </View>
      <IconButton icon="trash-outline" label="Xóa bản ghi" onPress={onCancel} disabled={busy} danger />
      {busy ? (
        <View style={[styles.iconButton, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel="Đang gửi bản ghi" accessibilityState={{ busy: true }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <IconButton icon="arrow-up" label={connected ? 'Gửi bản ghi' : 'Chờ kết nối để gửi'} onPress={onSend} disabled={!connected} primary />
      )}
    </View>
  );
}

export { formatDuration };

const styles = StyleSheet.create({
  bar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm },
  copy: { flex: 1 },
  previewCopy: { flex: 1, minWidth: 72 },
  statusText: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold },
  timer: { fontFamily: typography.family.mono, fontSize: typography.size.caption, marginTop: spacing.xxs },
  recordDot: { width: 10, height: 10, borderRadius: radius.round },
  iconButton: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', height: 8, borderRadius: radius.round, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radius.round },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
  disabled: { opacity: componentState.disabledOpacity },
});
