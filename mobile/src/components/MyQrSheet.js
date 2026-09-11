import React, { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ErrorState from './ErrorState';
import IdentityCard from './IdentityCard';
import { useTheme } from '../store/ThemeContext';
import { buildFriendQrPayload, isValidPublicUid, normalizePublicUid } from '../utils/friendQrPayload';
import { layout, radius, spacing, typography } from '../theme/tokens';

const QR_FOREGROUND = '#171614';
const QR_BACKGROUND = '#FFFFFF';

export default function MyQrSheet({ visible, onClose, user, onNotify }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const uid = normalizePublicUid(user?.uid);
  const payload = useMemo(() => {
    if (!isValidPublicUid(uid)) return null;
    return buildFriendQrPayload(uid);
  }, [uid]);
  const qrSize = Math.min(252, Math.max(184, width - (layout.screenPadding * 2 + spacing.display)));

  const notify = (message) => onNotify?.(message);

  const copyUid = async () => {
    if (!uid) return;
    try {
      await Clipboard.setStringAsync(uid);
      notify('Đã sao chép UID.');
    } catch {
      notify('Không thể sao chép UID lúc này.');
    }
  };

  const shareIdentity = async () => {
    if (!payload) return;
    try {
      await Share.share({
        title: 'Kết bạn trên Proxy',
        message: `${user?.name || 'Tôi'} mời bạn kết bạn trên Proxy.\n${payload}\nUID: ${uid}`,
      });
    } catch {
      notify('Không thể mở bảng chia sẻ lúc này.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Mã QR của tôi"
      description="Bạn bè có thể quét mã này để tìm đúng tài khoản của bạn."
    >
      <ScrollView
        style={{ maxHeight: Math.min(620, Math.max(240, height * 0.68)) }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <IdentityCard user={user} compact />

        {payload ? (
          <>
            <View
              style={styles.qrSurface}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Mã QR kết bạn của ${user?.name || 'bạn'}`}
            >
              <QRCode
                value={payload}
                size={qrSize}
                color={QR_FOREGROUND}
                backgroundColor={QR_BACKGROUND}
                ecl="M"
              />
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>QR chỉ chứa UID công khai, không chứa email, số điện thoại hay thông tin đăng nhập.</Text>
            <View style={styles.actions}>
              <Button title="Sao chép UID" icon="copy-outline" variant="outline" onPress={copyUid} style={styles.action} />
              <Button title="Chia sẻ mã" icon="share-social-outline" onPress={shareIdentity} style={styles.action} />
            </View>
          </>
        ) : (
          <ErrorState
            compact
            title="UID chưa sẵn sàng"
            message="Hồ sơ chưa nhận được UID hợp lệ từ máy chủ. Hãy đóng bảng này và tải lại hồ sơ."
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.md },
  qrSurface: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: QR_BACKGROUND },
  hint: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, textAlign: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  action: { flex: 1 },
});
