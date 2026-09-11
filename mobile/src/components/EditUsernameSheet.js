import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkUsernameAvailabilityApi, updateMyProfileApi } from '../api/user.api';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ConfirmationDialog from './ConfirmationDialog';
import { useTheme } from '../store/ThemeContext';
import { normalizeUsername, USERNAME_MAX_LENGTH, validateUsername } from '../utils/username';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

function getResponseData(response) {
  return response?.data?.user ?? response?.data ?? response?.user ?? null;
}

function getAvailabilityMessage(reason) {
  if (reason === 'reserved') return 'Tên người dùng này được dành riêng.';
  if (reason === 'taken' || reason === 'unavailable') return 'Tên người dùng này đã có người sử dụng.';
  if (reason === 'invalid') return 'Tên người dùng chưa đúng định dạng.';
  return 'Tên người dùng này chưa thể sử dụng.';
}

export default function EditUsernameSheet({
  visible,
  onClose,
  currentUsername,
  userId,
  onSaved,
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [availability, setAvailability] = useState({ state: 'idle', message: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const availabilitySequenceRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const visibleRef = useRef(visible);
  const userIdRef = useRef(userId);

  visibleRef.current = visible;
  userIdRef.current = userId;

  const normalizedCurrent = normalizeUsername(currentUsername || '');
  const validation = useMemo(() => validateUsername(value, { allowEmpty: true }), [value]);
  const normalizedValue = validation.username;
  const changed = normalizedValue !== normalizedCurrent;
  const removing = changed && !normalizedValue && !!normalizedCurrent;

  useEffect(() => {
    if (!visible) return;
    setValue(currentUsername || '');
    setAvailability({ state: 'idle', message: '' });
    setSubmitError('');
    setSubmitting(false);
    setConfirmRemove(false);
    setAvailabilityAttempt(0);
    submitInFlightRef.current = false;
  }, [currentUsername, visible]);

  useEffect(() => {
    availabilitySequenceRef.current += 1;
    const sequence = availabilitySequenceRef.current;

    if (!visible || !changed || !normalizedValue || !validation.valid) {
      setAvailability({ state: 'idle', message: '' });
      return undefined;
    }

    setAvailability({ state: 'checking', message: 'Đang kiểm tra tên người dùng…' });
    const timer = setTimeout(async () => {
      try {
        const response = await checkUsernameAvailabilityApi(normalizedValue);
        const data = response?.data ?? response;
        if (sequence !== availabilitySequenceRef.current || !visibleRef.current) return;
        if (normalizeUsername(data?.username || '') !== normalizedValue) return;
        setAvailability(data?.available
          ? { state: 'available', message: 'Tên người dùng có thể sử dụng.' }
          : { state: 'unavailable', message: getAvailabilityMessage(data?.reason) });
      } catch (error) {
        if (sequence !== availabilitySequenceRef.current || !visibleRef.current) return;
        setAvailability({
          state: 'error',
          message: error.message || 'Không thể kiểm tra tên người dùng. Kiểm tra kết nối rồi thử lại.',
        });
      }
    }, 420);

    return () => clearTimeout(timer);
  }, [availabilityAttempt, changed, normalizedValue, validation.valid, visible]);

  useEffect(() => () => {
    availabilitySequenceRef.current += 1;
    submitInFlightRef.current = false;
  }, []);

  const handleChange = (nextValue) => {
    setValue(nextValue.replace(/^@/, '').toLowerCase().slice(0, USERNAME_MAX_LENGTH));
    setSubmitError('');
  };

  const canSubmit = changed
    && validation.valid
    && (removing || availability.state === 'available')
    && !submitting;

  const submit = async (username) => {
    if (submitInFlightRef.current) return;
    const nextValidation = validateUsername(username, { allowEmpty: true });
    if (!nextValidation.valid) return;
    if (nextValidation.username && availability.state !== 'available') return;

    const ownerId = userId;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await updateMyProfileApi({ username: nextValidation.username || null });
      const updatedUser = getResponseData(response);
      if (!updatedUser || String(userIdRef.current) !== String(ownerId) || !visibleRef.current) return;
      await onSaved?.(updatedUser);
      if (String(userIdRef.current) === String(ownerId)) onClose();
    } catch (error) {
      if (String(userIdRef.current) !== String(ownerId) || !visibleRef.current) return;
      setSubmitError(error.message || 'Không thể lưu tên người dùng lúc này.');
      if (nextValidation.username) {
        setAvailability({ state: 'unavailable', message: 'Tên người dùng có thể vừa được người khác sử dụng.' });
      }
    } finally {
      submitInFlightRef.current = false;
      if (String(userIdRef.current) === String(ownerId)) setSubmitting(false);
    }
  };

  const handleSave = () => {
    if (!canSubmit) return;
    if (removing) {
      setConfirmRemove(true);
      return;
    }
    submit(normalizedValue);
  };

  const statusColor = availability.state === 'available'
    ? colors.success
    : availability.state === 'checking'
      ? colors.info
      : availability.state === 'idle'
        ? colors.textMuted
        : colors.danger;
  const statusIcon = availability.state === 'available'
    ? 'checkmark-circle'
    : availability.state === 'checking'
      ? 'time-outline'
      : 'alert-circle-outline';

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Tên người dùng"
        description="Tạo một tên dễ nhớ để bạn bè có thể tìm thấy bạn."
        dismissDisabled={submitting}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text }]}>Tên người dùng</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: focused ? colors.surface : colors.surfaceAlt,
                  borderColor: !validation.valid || submitError ? colors.danger : focused ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.prefix, { color: colors.textMuted }]}>@</Text>
              <TextInput
                value={value}
                onChangeText={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, { color: colors.text }]}
                placeholder="ten.cua.ban"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="done"
                maxLength={USERNAME_MAX_LENGTH}
                onSubmitEditing={handleSave}
                accessibilityLabel="Tên người dùng"
                accessibilityHint="Không nhập ký tự a còng ở đầu"
                accessibilityState={{ invalid: !validation.valid }}
              />
              <Text style={[styles.counter, { color: colors.textMuted }]}>{value.length}/{USERNAME_MAX_LENGTH}</Text>
            </View>

            {!validation.valid ? (
              <Text style={[styles.feedback, { color: colors.danger }]} accessibilityRole="alert">{validation.error}</Text>
            ) : availability.message ? (
              <View style={styles.statusRow} accessibilityLiveRegion="polite">
                <Ionicons name={statusIcon} size={iconSize.xs} color={statusColor} />
                <Text style={[styles.feedback, styles.statusText, { color: statusColor }]}>{availability.message}</Text>
              </View>
            ) : null}

            {availability.state === 'error' ? (
              <Pressable
                style={({ pressed }) => [styles.retry, { borderColor: colors.border }, pressed && styles.pressed]}
                onPress={() => {
                  setAvailability({ state: 'idle', message: '' });
                  setAvailabilityAttempt((attempt) => attempt + 1);
                }}
                accessibilityRole="button"
                accessibilityLabel="Thử kiểm tra lại tên người dùng"
              >
                <Text style={[styles.retryText, { color: colors.primary }]}>Thử kiểm tra lại</Text>
              </Pressable>
            ) : null}

            {submitError ? <Text style={[styles.submitError, { color: colors.danger }]} accessibilityRole="alert">{submitError}</Text> : null}

            <View style={[styles.guidance, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.textMuted} />
              <Text style={[styles.guidanceText, { color: colors.textMuted }]}>3–30 ký tự gồm chữ thường, số, dấu chấm hoặc gạch dưới. Bạn có thể đổi lại sau.</Text>
            </View>

            <Button
              title={removing ? 'Xóa tên người dùng' : 'Lưu tên người dùng'}
              icon={removing ? 'trash-outline' : 'checkmark'}
              variant={removing ? 'outline' : 'primary'}
              onPress={handleSave}
              loading={submitting}
              disabled={!canSubmit}
              style={styles.saveButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      <ConfirmationDialog
        visible={confirmRemove}
        title="Xóa tên người dùng?"
        message="Bạn bè sẽ không thể tìm tài khoản bằng tên này. UID và các kết nối hiện tại không thay đổi."
        confirmLabel="Xóa tên"
        danger
        loading={submitting}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          submit('');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.semibold, marginBottom: spacing.sm },
  inputRow: { minHeight: touchTarget.comfortable, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md },
  prefix: { fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input, fontWeight: typography.weight.bold, marginRight: spacing.xs },
  input: { flex: 1, minHeight: touchTarget.comfortable, paddingVertical: spacing.md, fontFamily: typography.family.body, fontSize: typography.size.input, lineHeight: typography.lineHeight.input },
  counter: { fontFamily: typography.family.mono, fontSize: typography.size.micro, marginLeft: spacing.sm },
  feedback: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginTop: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  statusText: { flex: 1, marginTop: 0, marginLeft: spacing.xs },
  retry: { alignSelf: 'flex-start', minHeight: touchTarget.compact, borderWidth: 1, borderRadius: radius.sm, justifyContent: 'center', paddingHorizontal: spacing.md, marginTop: spacing.sm },
  retryText: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, fontWeight: typography.weight.bold },
  submitError: { fontFamily: typography.family.body, fontSize: typography.size.bodySmall, lineHeight: typography.lineHeight.bodySmall, marginTop: spacing.md },
  guidance: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  guidanceText: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, marginLeft: spacing.sm },
  saveButton: { marginTop: spacing.lg, marginBottom: spacing.sm },
  pressed: { opacity: componentState.mutedOpacity },
});
