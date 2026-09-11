import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';

export const MAX_VOICE_DURATION_MS = 5 * 60 * 1000;
export const MIN_VOICE_DURATION_MS = 1000;

const deleteLocalFile = (uri) => {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup must never break the chat flow.
  }
};

export default function useVoiceRecorder(sessionKey) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const mountedRef = useRef(true);
  const phaseRef = useRef('idle');
  const sessionRef = useRef(0);
  const previewRef = useRef(null);
  const stopInFlightRef = useRef(false);
  const recorderStateRef = useRef(recorderState);
  const recordingUriRef = useRef(null);

  useEffect(() => {
    recorderStateRef.current = recorderState;
  }, [recorderState]);

  const updatePhase = useCallback((next) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }, []);

  const updatePreview = useCallback((next) => {
    previewRef.current = next;
    if (mountedRef.current) setPreview(next);
  }, []);

  const restorePlaybackMode = useCallback(async () => {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // The next playback attempt can configure the session again.
    }
  }, []);

  const discardPreview = useCallback(() => {
    deleteLocalFile(previewRef.current?.uri);
    updatePreview(null);
    setError('');
    setPermissionBlocked(false);
    updatePhase('idle');
  }, [updatePhase, updatePreview]);

  const stopRecording = useCallback(async ({ cancelled = false, reason = 'manual' } = {}) => {
    if (!mountedRef.current || stopInFlightRef.current || !['recording', 'preparing'].includes(phaseRef.current)) return null;
    stopInFlightRef.current = true;
    const activeSession = sessionRef.current;
    updatePhase('stopping');
    try {
      const beforeStop = recorder.getStatus();
      if (beforeStop.isRecording || beforeStop.canRecord) await recorder.stop();
      if (!mountedRef.current || activeSession !== sessionRef.current) {
        deleteLocalFile(recordingUriRef.current);
        return null;
      }
      const status = recorder.getStatus();
      const uri = recorder.uri || status.url;
      recordingUriRef.current = uri;
      const durationMillis = Math.max(status.durationMillis || 0, recorderStateRef.current?.durationMillis || 0);

      if (activeSession !== sessionRef.current || cancelled) {
        deleteLocalFile(uri);
        updatePreview(null);
        updatePhase('idle');
        return null;
      }

      if (!uri || durationMillis < MIN_VOICE_DURATION_MS) {
        deleteLocalFile(uri);
        updatePreview(null);
        setError('Bản ghi cần dài ít nhất 1 giây.');
        updatePhase('idle');
        return null;
      }

      const file = new File(uri);
      const nextPreview = {
        uri,
        durationMillis,
        size: file.exists ? file.size : 0,
        stoppedByLimit: reason === 'limit',
      };
      updatePreview(nextPreview);
      setError(reason === 'background' ? 'Đã dừng ghi âm khi ứng dụng chuyển nền.' : '');
      updatePhase('preview');
      return nextPreview;
    } catch (stopError) {
      deleteLocalFile(recordingUriRef.current);
      updatePreview(null);
      if (mountedRef.current) setError(stopError?.message || 'Không thể hoàn tất bản ghi âm.');
      updatePhase('idle');
      return null;
    } finally {
      stopInFlightRef.current = false;
      await restorePlaybackMode();
    }
  }, [recorder, restorePlaybackMode, updatePhase, updatePreview]);

  const startRecording = useCallback(async () => {
    if (!mountedRef.current || phaseRef.current !== 'idle' || previewRef.current) return false;
    const activeSession = sessionRef.current + 1;
    sessionRef.current = activeSession;
    setError('');
    setPermissionBlocked(false);
    updatePhase('requesting_permission');
    try {
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted) permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        if (mountedRef.current) setPermissionBlocked(permission.canAskAgain === false);
        setError(permission.canAskAgain === false
          ? 'Quyền microphone đã bị tắt. Hãy bật lại trong Cài đặt.'
          : 'Cần quyền microphone để ghi tin nhắn thoại.');
        updatePhase('idle');
        return false;
      }

      if (!mountedRef.current || activeSession !== sessionRef.current) {
        updatePhase('idle');
        return false;
      }

      updatePhase('preparing');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!mountedRef.current || activeSession !== sessionRef.current) {
        await restorePlaybackMode();
        return false;
      }
      await recorder.prepareToRecordAsync();
      if (!mountedRef.current) {
        await restorePlaybackMode();
        return false;
      }
      recordingUriRef.current = recorder.uri;
      if (activeSession !== sessionRef.current) {
        if (recorder.getStatus().canRecord) await recorder.stop();
        deleteLocalFile(recordingUriRef.current);
        updatePhase('idle');
        await restorePlaybackMode();
        return false;
      }
      recorder.record({ forDuration: MAX_VOICE_DURATION_MS / 1000 });
      updatePhase('recording');
      return true;
    } catch (startError) {
      deleteLocalFile(recordingUriRef.current);
      if (mountedRef.current) setError(startError?.message || 'Không thể bắt đầu ghi âm.');
      updatePhase('idle');
      await restorePlaybackMode();
      return false;
    }
  }, [recorder, restorePlaybackMode, updatePhase]);

  const cancelRecording = useCallback(async () => {
    sessionRef.current += 1;
    if (['recording', 'preparing'].includes(phaseRef.current)) {
      await stopRecording({ cancelled: true });
    } else {
      discardPreview();
    }
    setError('');
  }, [discardPreview, stopRecording]);

  const consumePreview = useCallback(() => {
    const consumed = previewRef.current;
    deleteLocalFile(consumed?.uri);
    updatePreview(null);
    setError('');
    updatePhase('idle');
    return consumed;
  }, [updatePhase, updatePreview]);

  useEffect(() => {
    if (phase !== 'recording') return;
    if (recorderState.mediaServicesDidReset) {
      setError('Phiên âm thanh đã bị gián đoạn.');
      stopRecording({ reason: 'interruption' });
      return;
    }
    if (recorderState.durationMillis >= MAX_VOICE_DURATION_MS) {
      stopRecording({ reason: 'limit' });
      return;
    }
    if (!recorderState.isRecording && recorderState.durationMillis > 0) {
      stopRecording({ reason: recorderState.durationMillis >= MAX_VOICE_DURATION_MS - 1000 ? 'limit' : 'interruption' });
    }
  }, [phase, recorderState.durationMillis, recorderState.isRecording, recorderState.mediaServicesDidReset, stopRecording]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && phaseRef.current === 'recording') {
        stopRecording({ reason: 'background' });
      }
    });
    return () => subscription.remove();
  }, [stopRecording]);

  useEffect(() => {
    sessionRef.current += 1;
    if (phaseRef.current === 'recording') stopRecording({ cancelled: true });
    else if (previewRef.current) discardPreview();
  }, [discardPreview, sessionKey, stopRecording]);

  useEffect(() => () => {
    mountedRef.current = false;
    sessionRef.current += 1;
    stopInFlightRef.current = true;
    deleteLocalFile(recordingUriRef.current || previewRef.current?.uri);
    recordingUriRef.current = null;
  }, []);

  return {
    phase,
    durationMillis: recorderState.durationMillis || 0,
    preview,
    error,
    permissionBlocked,
    isRecording: phase === 'recording',
    startRecording,
    stopRecording,
    cancelRecording,
    discardPreview,
    consumePreview,
    clearError: () => setError(''),
  };
}
