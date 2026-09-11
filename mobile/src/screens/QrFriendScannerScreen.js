import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { resolveFriendQrApi } from '../api/identity.api';
import { sendFriendRequestApi, respondFriendRequestApi } from '../api/social.api';
import { createPrivateConversationApi } from '../api/conversation.api';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import FriendIdentityPreview from '../components/FriendIdentityPreview';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { FRIEND_QR_VERSION, isValidPublicUid, parseFriendQrPayload } from '../utils/friendQrPayload';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

export default function QrFriendScannerScreen({ route, navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const requestSequenceRef = useRef(0);
  const scanningRef = useRef(false);
  const ownerUserIdRef = useRef(user?.id);
  const routeUid = route.params?.uid;
  const hasRouteUid = typeof routeUid === 'string' && routeUid.length > 0;
  const hasValidRouteUid = hasRouteUid && isValidPublicUid(routeUid);

  useEffect(() => {
    ownerUserIdRef.current = user?.id;
    return () => { requestSequenceRef.current += 1; };
  }, [user?.id]);

  const resolveUid = useCallback(async (uid) => {
    if (!isValidPublicUid(uid) || scanningRef.current) {
      if (!isValidPublicUid(uid)) setError('UID trong mã QR không hợp lệ.');
      return;
    }
    scanningRef.current = true;
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    const ownerUserId = ownerUserIdRef.current;
    setResolving(true);
    setError('');
    setActionError('');
    try {
      const response = await resolveFriendQrApi({ version: FRIEND_QR_VERSION, uid });
      if (sequence !== requestSequenceRef.current || ownerUserId !== ownerUserIdRef.current) return;
      setResult(response.data);
    } catch (err) {
      if (sequence !== requestSequenceRef.current || ownerUserId !== ownerUserIdRef.current) return;
      setError(err.status === 404
        ? 'Không tìm thấy tài khoản tương ứng với mã QR này.'
        : err.message || 'Không thể kiểm tra mã QR.');
    } finally {
      if (sequence === requestSequenceRef.current) {
        setResolving(false);
        scanningRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (!hasRouteUid) return;
    if (!hasValidRouteUid) {
      setError('Liên kết kết bạn không hợp lệ. Hãy quét một mã QR khác.');
      return;
    }
    resolveUid(routeUid);
  }, [hasRouteUid, hasValidRouteUid, resolveUid, routeUid]);

  const handleBarcode = ({ data }) => {
    if (scanningRef.current || result) return;
    try {
      const parsed = parseFriendQrPayload(data);
      resolveUid(parsed.uid);
    } catch (err) {
      scanningRef.current = true;
      setError(err.message || 'Mã QR không phải mã kết bạn Proxy.');
      setTimeout(() => { scanningRef.current = false; }, 900);
    }
  };

  const resetScanner = () => {
    requestSequenceRef.current += 1;
    scanningRef.current = false;
    setResult(null);
    setError('');
    setActionError('');
    setResolving(false);
    navigation.setParams({ uid: undefined });
  };

  const retryRouteResolve = () => {
    if (!hasValidRouteUid) return;
    scanningRef.current = false;
    resolveUid(routeUid);
  };

  const requestCameraPermission = async () => {
    setError('');
    try {
      await requestPermission();
    } catch {
      setError('Không thể yêu cầu quyền camera. Hãy mở Cài đặt và cấp quyền thủ công.');
    }
  };

  const openDeviceSettings = async () => {
    setError('');
    try {
      await Linking.openSettings();
    } catch {
      setError('Không thể mở Cài đặt trên thiết bị này.');
    }
  };

  const refreshRelationship = async () => {
    if (!result?.user?.uid) return;
    scanningRef.current = false;
    await resolveUid(result.user.uid);
  };

  const runAction = async (action) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError('');
    try {
      return await action();
    } catch (err) {
      setActionError(err.message || 'Không thể hoàn tất thao tác.');
      if ([403, 404, 409].includes(err.status)) await refreshRelationship();
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const sendRequest = () => runAction(async () => {
    await sendFriendRequestApi(result.user.id);
    setResult((current) => ({ ...current, relationship: 'outgoing_pending' }));
  });

  const acceptRequest = () => runAction(async () => {
    const response = await respondFriendRequestApi(result.friendship_id, 'accepted');
    setResult((current) => ({
      ...current,
      relationship: 'accepted',
      conversation_id: response.conversation_id || current.conversation_id,
    }));
  });

  const openChat = () => runAction(async () => {
    let conversationId = result.conversation_id;
    if (!conversationId) {
      const response = await createPrivateConversationApi(result.user.id);
      conversationId = response.data.id;
    }
    navigation.navigate('Chat', { conversationId });
  });

  if (!permission && !hasRouteUid) {
    return <View style={[styles.root, { backgroundColor: colors.background }]}><LoadingState count={4} /></View>;
  }

  if (!permission?.granted && !hasRouteUid) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={[styles.permissionIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="scan-outline" size={iconSize.xl} color={colors.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.text }]}>Cho phép camera để quét QR</Text>
        <Text style={[styles.permissionBody, { color: colors.textMuted }]}>Camera chỉ dùng để đọc mã kết bạn Proxy. Ứng dụng không tự lưu hình ảnh khi quét.</Text>
        {error ? <Text style={[styles.permissionError, { color: colors.danger }]} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.permissionActions}>
          {permission.canAskAgain ? (
            <Button title="Cho phép camera" icon="camera-outline" onPress={requestCameraPermission} />
          ) : (
            <Button title="Mở cài đặt" icon="settings-outline" onPress={openDeviceSettings} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {result ? (
        <View style={[styles.resultWrap, { paddingBottom: insets.bottom + spacing.xl }]}>
          <FriendIdentityPreview
            result={result}
            busy={actionBusy}
            error={actionError}
            onSendRequest={sendRequest}
            onAcceptRequest={acceptRequest}
            onOpenChat={openChat}
            onScanAgain={resetScanner}
          />
        </View>
      ) : resolving ? (
        <View style={styles.centered}><LoadingState count={4} /></View>
      ) : hasRouteUid && error ? (
        <View style={[styles.centered, { paddingBottom: insets.bottom + spacing.xl }]}>
          <ErrorState title="Không thể mở mã kết bạn" message={error} />
          <View style={styles.routeErrorActions}>
            {hasValidRouteUid ? (
              <Button title="Thử lại" icon="refresh-outline" onPress={retryRouteResolve} />
            ) : null}
            <Button title="Quét mã khác" icon="scan-outline" variant="outline" onPress={resetScanner} />
          </View>
        </View>
      ) : (
        <View style={styles.cameraShell}>
          {permission?.granted && isFocused ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcode}
            />
          ) : null}
          <View pointerEvents="none" style={styles.cameraOverlay}>
            <View style={[styles.guide, { borderColor: colors.onPrimary }]}>
              <View style={[styles.guideInner, { borderColor: colors.primary }]} />
            </View>
            <Text style={styles.cameraHelp}>Đặt mã QR kết bạn vào trong khung</Text>
          </View>
          {error ? (
            <View style={[styles.errorPanel, { backgroundColor: colors.surface }]}>
              <ErrorState compact title="Chưa đọc được mã" message={error} />
              <Pressable
                style={({ pressed }) => [styles.retry, { backgroundColor: colors.primarySoft }, pressed && styles.pressed]}
                onPress={() => { setError(''); scanningRef.current = false; }}
                accessibilityRole="button"
                accessibilityLabel="Thử quét lại"
              >
                <Text style={[styles.retryText, { color: colors.primary }]}>Thử quét lại</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  permissionIcon: { width: 72, height: 72, borderRadius: radius.round, justifyContent: 'center', alignItems: 'center' },
  permissionTitle: { marginTop: spacing.xl, textAlign: 'center', fontFamily: typography.family.display, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.heavy },
  permissionBody: { maxWidth: 330, marginTop: spacing.md, textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.body, lineHeight: typography.lineHeight.body },
  permissionError: { maxWidth: 330, marginTop: spacing.md, textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall },
  permissionActions: { width: '100%', maxWidth: 360, marginTop: spacing.xxl },
  cameraShell: { flex: 1, overflow: 'hidden', backgroundColor: '#000000' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  guide: { width: 250, height: 250, maxWidth: '80%', borderWidth: 2, borderRadius: radius.xl, padding: spacing.sm },
  guideInner: { flex: 1, borderWidth: 2, borderRadius: radius.lg },
  cameraHelp: { marginTop: spacing.xl, color: '#FFFFFF', textAlign: 'center', fontFamily: typography.family.body, fontSize: typography.size.body, fontWeight: typography.weight.semibold, textShadowColor: '#000000', textShadowRadius: 4 },
  errorPanel: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl, borderRadius: radius.xl, padding: spacing.lg },
  retry: { minHeight: touchTarget.default, marginTop: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  resultWrap: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  routeErrorActions: { width: '100%', maxWidth: 360, marginTop: spacing.xl, gap: spacing.sm },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
