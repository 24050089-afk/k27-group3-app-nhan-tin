import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../store/ThemeContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';
import { formatDuration } from './VoiceRecorderBar';

export default function VoiceMessagePlayer({
  messageId,
  attachment,
  mine,
  activeVoiceId,
  onRequestPlay,
  onLongPress,
}) {
  const { colors } = useTheme();
  const source = resolveMediaUrl(attachment?.file_url);
  const player = useAudioPlayer(source || null, { updateInterval: 250, downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const mountedRef = useRef(true);
  const playerRef = useRef(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const isActive = String(activeVoiceId) === String(messageId);
  const durationMs = (status.duration || 0) * 1000;
  const currentMs = (status.currentTime || 0) * 1000;
  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;
  const loadFailed = status.playbackState === 'error';

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
    if (!isActive && status.playing) runPlayerAction((currentPlayer) => currentPlayer.pause());
  }, [isActive, player, status.playing]);

  useEffect(() => {
    if (status.didJustFinish && isActive) onRequestPlay?.(null);
  }, [isActive, onRequestPlay, status.didJustFinish]);

  const togglePlayback = async () => {
    if (source.length === 0) return;
    if (loadFailed) {
      await runPlayerAction((currentPlayer) => currentPlayer.replace(source));
      return;
    }
    if (!status.isLoaded) return;
    if (status.playing) {
      await runPlayerAction((currentPlayer) => currentPlayer.pause());
      onRequestPlay?.(null);
      return;
    }
    onRequestPlay?.(messageId);
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      const canContinue = await runPlayerAction((currentPlayer) => currentPlayer.seekTo(0));
      if (!canContinue) return;
    }
    await runPlayerAction((currentPlayer) => currentPlayer.play());
  };

  const seek = async (event) => {
    if (!trackWidth || !status.duration) return;
    onRequestPlay?.(messageId);
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
    await runPlayerAction((currentPlayer) => currentPlayer.seekTo(ratio * status.duration));
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: mine ? colors.bubbleMineSurface : colors.surfaceAlt,
          borderColor: mine ? colors.bubbleMineMuted : colors.border,
        },
        pressed && styles.pressed,
      ]}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Tin nhắn thoại, ${durationMs ? formatDuration(durationMs) : 'đang tải thời lượng'}`}
      accessibilityHint="Chạm nút phát để nghe, nhấn giữ để mở tùy chọn tin nhắn"
    >
      <Pressable
        style={[styles.play, { backgroundColor: mine ? colors.bubbleMineText : colors.primary }]}
        onPress={togglePlayback}
        disabled={!status.isLoaded && !loadFailed}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Tạm dừng tin nhắn thoại' : 'Phát tin nhắn thoại'}
        accessibilityState={{ disabled: !status.isLoaded && !loadFailed }}
      >
        {loadFailed ? (
          <Ionicons name="refresh" size={iconSize.sm} color={mine ? colors.primary : colors.onPrimary} />
        ) : !status.isLoaded || status.isBuffering ? (
          <ActivityIndicator size="small" color={mine ? colors.primary : colors.onPrimary} />
        ) : (
          <Ionicons name={status.playing ? 'pause' : 'play'} size={iconSize.sm} color={mine ? colors.primary : colors.onPrimary} />
        )}
      </Pressable>
      <View style={styles.body}>
        <Pressable
          style={[styles.track, { backgroundColor: mine ? colors.bubbleMineMuted : colors.border }]}
          onPress={seek}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Tiến trình tin nhắn thoại"
          accessibilityValue={{ min: 0, max: Math.round(status.duration || 0), now: Math.round(status.currentTime || 0) }}
        >
          <View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: mine ? colors.bubbleMineText : colors.primary }]} />
        </Pressable>
        <Text style={[styles.time, { color: mine ? colors.bubbleMineMuted : colors.textMuted }]}>
          {formatDuration(currentMs)} / {durationMs ? formatDuration(durationMs) : '--:--'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 210, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  play: { width: touchTarget.compact, height: touchTarget.compact, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  track: { height: 8, borderRadius: radius.round, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: radius.round },
  time: { marginTop: spacing.xs, fontFamily: typography.family.mono, fontSize: typography.size.micro },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
