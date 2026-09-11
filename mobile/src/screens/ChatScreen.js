import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import useConversationDetails from '../hooks/useConversationDetails';
import { canSendPayload, conversationCapabilities } from '../utils/groupPermissions';
import { FlatList, Keyboard, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  editMessageApi,
  getConversationApi,
  getMessagesApi,
  markConversationSeenApi,
  reactToMessageApi,
  recallMessageApi,
  removeReactionApi,
  sendMessageApi,
} from '../api/conversation.api';
import { getSocket } from '../api/socket';
import { MAX_CHAT_IMAGE_SIZE, MAX_CHAT_VOICE_SIZE, MAX_CHAT_VIDEO_SIZE, uploadChatImageApi, uploadChatVoiceApi, uploadChatVideoApi } from '../api/upload.api';
import Avatar from '../components/Avatar';
import BottomSheet from '../components/BottomSheet';
import ConfirmationDialog from '../components/ConfirmationDialog';
import ConnectionBanner from '../components/ConnectionBanner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ForwardMessageSheet from '../components/ForwardMessageSheet';
import FriendshipChatStarter from '../components/FriendshipChatStarter';
import ImageViewer from '../components/ImageViewer';
import LoadingState from '../components/LoadingState';
import MessageActionSheet from '../components/MessageActionSheet';
import MessageBubble, { DateSeparator } from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import SettingsRow from '../components/SettingsRow';
import ToastMessage from '../components/ToastMessage';
import useSocketStatus from '../hooks/useSocketStatus';
import useVoiceRecorder, { MIN_VOICE_DURATION_MS } from '../hooks/useVoiceRecorder';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { setActiveNotificationConversation } from '../store/NotificationContext';
import { getHiddenMessageSet, hideMessageLocally } from '../utils/hiddenMessages';
import { downloadMediaToLibrary } from '../utils/mediaDownload';
import { getAttachmentMediaKind, sanitizeForwardPayload } from '../utils/messageActions';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

const getLastSeenLabel = (value) => {
  if (!value) return 'Ngoại tuyến';
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? `Hoạt động lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    : `Hoạt động ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const canCluster = (a, b) => {
  if (!a || !b || a.type === 'system' || b.type === 'system') return false;
  if (Number(a.sender_id) !== Number(b.sender_id)) return false;
  if (!isSameDay(a.created_at, b.created_at)) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) <= 5 * 60 * 1000;
};

const upsertIntoList = (items, incoming) => {
  if (!incoming?.id) return items;
  const index = items.findIndex((item) => String(item.id) === String(incoming.id));
  if (index < 0) return [...items, incoming];
  const next = [...items];
  next[index] = incoming;
  return next;
};

const markSeenInList = (items, currentUserId, messageId) => items.map((message) => (
  Number(message.sender_id) === Number(currentUserId) && Number(message.id) <= Number(messageId)
    ? { ...message, outgoing_status: 'seen' }
    : message
));

const applyQueuedEvents = (initial, events, currentUserId) => events.reduce((items, event) => {
  if (event.type === 'upsert') return upsertIntoList(items, event.message);
  if (event.type === 'seen') return markSeenInList(items, currentUserId, event.messageId);
  return items;
}, initial);

export default function ChatScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const connected = useSocketStatus();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const listRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const hydratedRef = useRef(false);
  const hiddenIdsRef = useRef(new Set());
  const pendingSocketEventsRef = useRef([]);
  const forwardInFlightRef = useRef(false);
  const latestUserIdRef = useRef(user?.id);
  const downloadSessionRef = useRef(null);
  const downloadSequenceRef = useRef(0);
  const conversationDetails = useConversationDetails(conversationId);
  const { data: conversation } = conversationDetails;
  const permissionsKnown = conversationDetails.verified && !conversationDetails.error;
  const capabilities = conversationCapabilities(permissionsKnown || conversation?.type === 'private' ? conversation : null);
  const [messages, setMessages] = useState([]);
  const [serverMessageCount, setServerMessageCount] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set());
  const [chatHydrated, setChatHydrated] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [actionContext, setActionContext] = useState(null);
  const [actionBusy, setActionBusy] = useState('');
  const [forwardMessageId, setForwardMessageId] = useState(null);
  const [forwarding, setForwarding] = useState(false);
  const [forwardError, setForwardError] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null);
  const [activeVoiceId, setActiveVoiceId] = useState(null);
  const [toast, setToast] = useState(null);
  const voiceRecorder = useVoiceRecorder(`${user?.id || 'guest'}:${conversationId}`);

  useEffect(() => {
    if (conversationDetails.error?.status === 404) navigation.navigate('Main', { screen: 'Chats' });
    if (permissionsKnown && conversation && !conversationCapabilities(conversation).send_voice_messages && voiceRecorder.phase !== 'idle') {
      voiceRecorder.cancelRecording();
      setSendError('Quyền gửi tin nhắn thoại đã bị tắt. Bản nháp văn bản vẫn được giữ.');
    }
  }, [conversation, permissionsKnown, conversationDetails.error, navigation, voiceRecorder.phase, voiceRecorder.cancelRecording]);

  const refreshDeniedPermissions = (error) => {
    if (['GROUP_PERMISSION_DENIED', 'GROUP_POLICY_UNAVAILABLE', 'CONVERSATION_NOT_FOUND'].includes(error.code)) conversationDetails.refresh().catch(() => {});
  };

  useEffect(() => {
    setActiveNotificationConversation(conversationId);
    return () => setActiveNotificationConversation(null);
  }, [conversationId]);

  const composerPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value > 0 ? spacing.sm : Math.max(insets.bottom, spacing.sm),
  }), [insets.bottom]);
  const keyboardSpacerStyle = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  const showToast = useCallback((message, options = {}) => {
    setToast({ message, actionLabel: options.actionLabel, onAction: options.onAction, duration: options.duration });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const upsertMessage = useCallback((incoming) => {
    if (!incoming?.id) return;
    setServerMessageCount((current) => Math.max(Number(current) || 0, 1));
    if (!hydratedRef.current) {
      pendingSocketEventsRef.current.push({ type: 'upsert', message: incoming });
      return;
    }
    if (hiddenIdsRef.current.has(String(incoming.id))) return;
    setMessages((current) => upsertIntoList(current, incoming));
  }, []);

  const isGroup = conversation?.type === 'group';
  const otherMember = conversation?.members?.find((item) => Number(item.user_id) !== Number(user?.id));
  const myMember = conversation?.members?.find((item) => Number(item.user_id) === Number(user?.id));
  const title = isGroup ? conversation?.name || 'Nhóm chat' : otherMember?.user?.name || 'Cuộc trò chuyện';
  const avatarUser = useMemo(
    () => (isGroup ? { name: title, avatar: conversation?.avatar } : otherMember?.user),
    [conversation?.avatar, isGroup, otherMember?.user, title],
  );
  const statusText = isGroup
    ? `${conversation?.members?.length || 0} thành viên`
    : otherMember?.user?.is_online
      ? 'Đang hoạt động'
      : getLastSeenLabel(otherMember?.user?.last_seen_at);

  const actionMessage = useMemo(() => (
    actionContext ? messages.find((item) => String(item.id) === String(actionContext.messageId)) || null : null
  ), [actionContext, messages]);
  const selectedActionAttachment = useMemo(() => {
    if (!actionMessage || !actionContext?.attachmentKey) return null;
    return (actionMessage.attachments || []).find((item) => (
      String(item.id || item.file_url) === String(actionContext.attachmentKey)
    )) || null;
  }, [actionContext, actionMessage]);
  const forwardMessage = useMemo(() => (
    forwardMessageId ? messages.find((item) => String(item.id) === String(forwardMessageId)) || null : null
  ), [forwardMessageId, messages]);

  useEffect(() => {
    latestUserIdRef.current = user?.id;
  }, [user?.id]);
  useEffect(() => () => {
    if (downloadSessionRef.current) downloadSessionRef.current.cancelled = true;
    forwardInFlightRef.current = false;
  }, []);

  const lastOutgoingMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (Number(messages[index].sender_id) === Number(user?.id)) return messages[index].id;
    }
    return null;
  }, [messages, user?.id]);

  const displayMessages = useMemo(() => messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const joinsPrevious = canCluster(previous, message);
    const joinsNext = canCluster(message, next);
    return {
      message,
      clusterPosition: !joinsPrevious && !joinsNext ? 'single' : !joinsPrevious ? 'first' : !joinsNext ? 'last' : 'middle',
      showDate: !previous || !isSameDay(previous.created_at, message.created_at),
      showSender: isGroup && !joinsPrevious,
      showAvatar: isGroup && !joinsNext,
      showMeta: !joinsNext,
    };
  }), [isGroup, messages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Avatar user={avatarUser} size={30} showStatus={!isGroup} variant={isGroup ? 'group' : 'person'} />
          <View style={styles.headerCopy}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.headerStatus, { color: otherMember?.user?.is_online && !isGroup ? colors.success : colors.textMuted }]} numberOfLines={1}>{statusText}</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <Pressable
          style={({ pressed }) => [styles.headerAction, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
          onPress={() => navigation.navigate(
            isGroup ? 'GroupSettings' : 'PrivateConversationInfo',
            isGroup ? { conversationId, initialConversation: conversation, initialUserId: user?.id } : { conversationId },
          )}
          accessibilityRole="button"
          accessibilityLabel="Thông tin cuộc trò chuyện"
          hitSlop={5}
        >
          <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={colors.text} />
        </Pressable>
      ),
    });
  }, [avatarUser, colors.success, colors.surfaceAlt, colors.text, colors.textMuted, conversation, isGroup, navigation, conversationId, otherMember?.user?.is_online, statusText, title, user?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setChatHydrated(false);
    hydratedRef.current = false;
    try {
      let hiddenStorageFailed = false;
      const [messageRes, restoredHiddenIds] = await Promise.all([
        getMessagesApi(conversationId, { page: 1, limit: 50 }),
        getHiddenMessageSet(user?.id, conversationId).catch(() => {
          hiddenStorageFailed = true;
          return new Set();
        }),
      ]);
      hiddenIdsRef.current = restoredHiddenIds;
      setHiddenMessageIds(new Set(restoredHiddenIds));
      let nextMessages = applyQueuedEvents(messageRes.data || [], pendingSocketEventsRef.current, user?.id);
      pendingSocketEventsRef.current = [];
      nextMessages = nextMessages.filter((message) => !restoredHiddenIds.has(String(message.id)));
      setServerMessageCount(Math.max(
        Number(messageRes.meta?.total ?? messageRes.data?.length ?? 0),
        nextMessages.length
      ));
      setMessages(nextMessages);
      hydratedRef.current = true;
      setChatHydrated(true);
      if (hiddenStorageFailed) showToast('Không thể khôi phục các tin nhắn đã ẩn trên thiết bị.');
      markConversationSeenApi(conversationId).catch(() => {});
    } catch (err) {
      setLoadError(err.message || 'Không thể tải cuộc trò chuyện.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, showToast, user?.id]);

  useEffect(() => {
    setActionContext(null);
    setActiveMedia(null);
    pendingSocketEventsRef.current = [];
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const handleUpsert = ({ conversationId: incomingConversationId, message }) => {
      if (Number(incomingConversationId) === Number(conversationId)) upsertMessage(message);
    };
    const handleConversationSeen = ({ conversationId: incomingConversationId, userId, messageId }) => {
      if (Number(incomingConversationId) !== Number(conversationId) || Number(userId) === Number(user?.id)) return;
      if (!hydratedRef.current) {
        pendingSocketEventsRef.current.push({ type: 'seen', messageId });
        return;
      }
      setMessages((current) => markSeenInList(current, user?.id, messageId));
    };
    const joinConversation = () => socket.emit('conversation:join', { conversationId });
    joinConversation();
    socket.on('connect', joinConversation);
    socket.on('message:new', handleUpsert);
    socket.on('message:updated', handleUpsert);
    socket.on('conversation:seen', handleConversationSeen);
    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('connect', joinConversation);
      socket.off('message:new', handleUpsert);
      socket.off('message:updated', handleUpsert);
      socket.off('conversation:seen', handleConversationSeen);
    };
  }, [conversationId, upsertMessage, user?.id]);

  useEffect(() => {
    if (!actionContext) return;
    if (!actionMessage) {
      setActionContext(null);
      return;
    }
    if (!actionContext.openedRecalled && actionMessage.recalled) {
      setActionContext(null);
      showToast('Tin nhắn vừa được thu hồi.');
      return;
    }
    if (actionContext.attachmentKey && !selectedActionAttachment) {
      setActionContext(null);
      showToast('Phương tiện này không còn khả dụng.');
    }
  }, [actionContext, actionMessage, selectedActionAttachment, showToast]);

  useEffect(() => {
    if (!forwardMessageId) return;
    if (!forwardMessage || forwardMessage.recalled) {
      setForwardMessageId(null);
      setForwardError('');
      showToast('Tin nhắn không còn có thể chuyển tiếp.');
    }
  }, [forwardMessage, forwardMessageId, showToast]);

  useEffect(() => {
    if (!activeVoiceId || activeVoiceId === '__voice-preview__') return;
    const activeMessage = messages.find((item) => String(item.id) === String(activeVoiceId));
    if (!activeMessage || activeMessage.recalled || hiddenMessageIds.has(String(activeVoiceId))) setActiveVoiceId(null);
  }, [activeVoiceId, hiddenMessageIds, messages]);

  const scrollToLatest = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);
  useEffect(() => {
    if (messages.length) scrollToLatest(true);
  }, [messages.length, scrollToLatest]);

  const openMessageActions = useCallback((message, attachment = null) => {
    if (!message) return;
    setActiveMedia(null);
    setActionContext({
      messageId: String(message.id),
      attachmentKey: attachment ? String(attachment.id || attachment.file_url) : null,
      openedRecalled: !!message.recalled,
    });
  }, []);

  const openMedia = useCallback((message, attachment) => {
    if (getAttachmentMediaKind(attachment, message?.type) === 'video') {
      Linking.openURL(resolveMediaUrl(attachment.file_url)).catch(() => showToast('Không thể mở video này.'));
      return;
    }
    setActionContext(null);
    setActiveMedia({ messageId: String(message.id), attachment });
  }, [showToast]);

  const cancelComposerContext = () => {
    if (editTarget) setText('');
    setReplyTarget(null);
    setEditTarget(null);
    setSendError('');
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sendInFlightRef.current || !capabilities.send_text_messages) return;
    sendInFlightRef.current = true;
    setSending(true);
    setSendError('');
    setText('');
    try {
      if (editTarget) {
        const res = await editMessageApi(editTarget.id, content);
        upsertMessage(res.data);
        setEditTarget(null);
      } else {
        const res = await sendMessageApi(conversationId, { content, type: 'text', reply_to_id: replyTarget?.id || null });
        upsertMessage(res.data);
        setReplyTarget(null);
      }
    } catch (err) {
      setText(content);
      refreshDeniedPermissions(err);
      setSendError(err.message);
      if (editTarget) load();
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const canSendVideo = capabilities.send_media === true && capabilities.send_photos === true && capabilities.send_voice_messages === true;
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const mediaGeneration = useRef(0);
  useEffect(() => {
    sendInFlightRef.current = false;
    setSending(false);
    setShowAttachmentMenu(false);
    return () => { mediaGeneration.current += 1; };
  }, [conversationId, user?.id]);

  const handlePickImage = async (video = false) => {
    if (sendInFlightRef.current || editTarget || !connected || (video ? !canSendVideo : !capabilities.send_photos)) return;
    setShowAttachmentMenu(false);
    sendInFlightRef.current = true;
    setSending(true);
    setSendError('');
    const generation = mediaGeneration.current;
    let stage = 'picker';
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: video ? ['videos'] : ['images'], allowsEditing: false, quality: 0.85 });
      if (generation !== mediaGeneration.current || result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > (video ? MAX_CHAT_VIDEO_SIZE : MAX_CHAT_IMAGE_SIZE)) {
        setSendError(video ? 'Video vượt quá giới hạn 25 MB.' : 'Ảnh vượt quá giới hạn 10 MB.');
        return;
      }
      stage = 'upload';
      const uploaded = await (video ? uploadChatVideoApi(asset) : uploadChatImageApi(asset));
      if (generation !== mediaGeneration.current) return;
      stage = 'message';
      const res = await sendMessageApi(conversationId, { content: '', type: video ? 'video' : 'image', reply_to_id: replyTarget?.id || null, attachments: [uploaded.data] });
      if (generation !== mediaGeneration.current) return;
      upsertMessage(res.data);
      setReplyTarget(null);
    } catch (err) {
      if (generation !== mediaGeneration.current) return;
      const guidance = stage === 'upload' ? 'Kiểm tra kết nối hoặc thử tệp nhỏ hơn.' : stage === 'message' ? 'Tệp đã tải lên nhưng chưa tạo được tin nhắn; không tự động gửi lại.' : 'Đóng thư viện rồi thử chọn lại.';
      setSendError(`${err.message} ${guidance}`);
      refreshDeniedPermissions(err);
    } finally {
      if (generation === mediaGeneration.current) {
        sendInFlightRef.current = false;
        setSending(false);
      }
    }
  };

  const startVoiceRecording = async () => {
    if (sendInFlightRef.current || editTarget || !capabilities.send_voice_messages || (text.trim() && capabilities.send_text_messages)) return;
    Keyboard.dismiss();
    setSendError('');
    setActionContext(null);
    setActiveVoiceId(null);
    await voiceRecorder.startRecording();
  };

  const sendVoiceRecording = async () => {
    const recording = voiceRecorder.preview;
    if (!recording || sendInFlightRef.current || !capabilities.send_voice_messages) return;
    if (recording.durationMillis < MIN_VOICE_DURATION_MS) {
      setSendError('Bản ghi cần dài ít nhất 1 giây.');
      return;
    }
    if (recording.size > MAX_CHAT_VOICE_SIZE) {
      setSendError('Bản ghi vượt quá giới hạn 10 MB.');
      return;
    }

    sendInFlightRef.current = true;
    setSending(true);
    setSendError('');
    let stage = 'upload';
    let uploadedAttachment = null;
    try {
      const uploaded = await uploadChatVoiceApi(recording);
      uploadedAttachment = uploaded.data;
      stage = 'message';
      const res = await sendMessageApi(conversationId, {
        content: '',
        type: 'voice',
        reply_to_id: replyTarget?.id || null,
        attachments: [uploaded.data],
      });
      upsertMessage(res.data);
      setReplyTarget(null);
      voiceRecorder.consumePreview();
    } catch (err) {
      if (stage === 'message' && uploadedAttachment?.file_url) {
        refreshDeniedPermissions(err);
        try {
          const latest = await getMessagesApi(conversationId, { page: 1, limit: 30 });
          const received = (latest.data || []).find((message) => (
            message.type === 'voice'
            && Number(message.sender_id) === Number(user?.id)
            && (message.attachments || []).some((attachment) => (
              resolveMediaUrl(attachment.file_url) === resolveMediaUrl(uploadedAttachment.file_url)
            ))
          ));
          if (received) {
            upsertMessage(received);
            setReplyTarget(null);
            voiceRecorder.consumePreview();
            showToast('Tin nhắn thoại đã được máy chủ nhận.');
            return;
          }
        } catch {
          // Keep the preview so the user can decide whether to retry.
        }
      }
      const guidance = stage === 'message'
        ? 'Bản ghi đã tải lên nhưng chưa tạo được tin nhắn; hãy kiểm tra cuộc trò chuyện trước khi gửi lại.'
        : 'Bản ghi vẫn được giữ để bạn thử lại.';
      setSendError(`${err.message} ${guidance}`);
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const startReply = () => {
    if (!actionMessage) return;
    setActionContext(null);
    setEditTarget(null);
    setReplyTarget(actionMessage);
    setSendError('');
  };
  const startEdit = () => {
    if (!actionMessage || !capabilities.send_text_messages) return;
    setActionContext(null);
    setReplyTarget(null);
    setEditTarget(actionMessage);
    setText(actionMessage.content || '');
    setSendError('');
  };

  const openForward = () => {
    if (!actionMessage) return;
    setForwardMessageId(String(actionMessage.id));
    setForwardError('');
    setActionContext(null);
  };

  const forwardToConversation = async (targetConversationId) => {
    if (!forwardMessage || forwardInFlightRef.current || Number(targetConversationId) === Number(conversationId)) return;
    const payload = sanitizeForwardPayload(forwardMessage);
    if (!payload) {
      setForwardError('Tin nhắn không còn nội dung hợp lệ để chuyển tiếp.');
      return;
    }
    forwardInFlightRef.current = true;
    setForwarding(true);
    setForwardError('');
    try {
      const target = await getConversationApi(targetConversationId);
      if (!canSendPayload(target.data, payload)) throw new Error('Nhóm đích chưa cho phép loại nội dung này. Hãy chọn cuộc trò chuyện khác.');
      await sendMessageApi(targetConversationId, payload);
      setForwardMessageId(null);
      showToast('Đã chuyển tiếp tin nhắn.', {
        actionLabel: 'Xem',
        onAction: () => {
          setToast(null);
          navigation.navigate('Chat', { conversationId: targetConversationId });
        },
        duration: 5000,
      });
    } catch (err) {
      const timedOut = String(err.message || '').includes('mất quá nhiều thời gian');
      setForwardError(timedOut
        ? 'Yêu cầu đã hết thời gian chờ và máy chủ có thể đã nhận tin. Hãy kiểm tra cuộc trò chuyện đích trước khi thử lại.'
        : err.message || 'Không thể chuyển tiếp tin nhắn.');
    } finally {
      forwardInFlightRef.current = false;
      setForwarding(false);
    }
  };

  const downloadAttachments = async (attachments) => {
    if (!actionMessage || !attachments?.length) return;
    const ownerUserId = user?.id;
    const sessionId = `${Date.now()}-${downloadSequenceRef.current + 1}`;
    downloadSequenceRef.current += 1;
    const session = { sessionId, ownerUserId, cancelled: false };
    downloadSessionRef.current = session;
    const messageType = actionMessage.type;
    setActionContext(null);
    const isSessionCurrent = () => (
      downloadSessionRef.current === session
      && !session.cancelled
      && Number(latestUserIdRef.current) === Number(ownerUserId)
    );
    try {
      const results = await downloadMediaToLibrary({
        attachments,
        messageType,
        sessionId,
        isSessionCurrent,
        onProgress: ({ completed, total }) => {
          if (isSessionCurrent()) showToast(`Đang lưu phương tiện ${completed}/${total}…`, { duration: 60000 });
        },
      });
      if (!isSessionCurrent()) return;
      const saved = results.filter((item) => item.saved).length;
      const failed = results.length - saved;
      if (!failed) showToast(`Đã lưu ${saved} phương tiện vào thư viện.`);
      else {
        const firstError = results.find((item) => !item.saved)?.error?.message;
        showToast(`Đã lưu ${saved}/${results.length}. ${firstError || 'Một số file không thể lưu.'}`);
      }
    } catch (err) {
      if (err.code === 'session-cancelled') return;
      showToast(err.message || 'Không thể lưu phương tiện.', {
        actionLabel: err.code === 'permission-denied' && err.canAskAgain === false ? 'Mở cài đặt' : undefined,
        onAction: err.code === 'permission-denied' && err.canAskAgain === false ? () => Linking.openSettings() : undefined,
        duration: 6000,
      });
    } finally {
      if (downloadSessionRef.current === session) downloadSessionRef.current = null;
    }
  };

  const copyMessage = async () => {
    if (!actionMessage?.content) return;
    const content = actionMessage.content;
    setActionContext(null);
    try {
      await Clipboard.setStringAsync(content);
      showToast('Đã sao chép tin nhắn.');
    } catch {
      showToast('Không thể sao chép tin nhắn.');
    }
  };

  const toggleReaction = async (type) => {
    if (!actionMessage || actionBusy) return;
    const snapshot = actionMessage;
    const currentReaction = (snapshot.reactions || []).find((item) => Number(item.user_id) === Number(user?.id));
    if (currentReaction?.type !== type && !capabilities.react) return;
    setActionBusy(`reaction:${type}`);
    if (currentReaction?.type === type) {
      setMessages((current) => current.map((item) => String(item.id) === String(snapshot.id)
        ? { ...item, reactions: (item.reactions || []).filter((reaction) => Number(reaction.user_id) !== Number(user?.id)) }
        : item));
    }
    try {
      if (currentReaction?.type === type) {
        await removeReactionApi(snapshot.id);
      } else {
        const res = await reactToMessageApi(snapshot.id, type);
        upsertMessage(res.data);
      }
      setActionContext(null);
    } catch (err) {
      upsertMessage(snapshot);
      refreshDeniedPermissions(err);
      showToast(err.message || 'Không thể cập nhật cảm xúc.');
      load();
    } finally {
      setActionBusy('');
    }
  };

  const requestDelete = () => {
    if (!actionMessage) return;
    setConfirmAction({ type: 'delete', messageId: String(actionMessage.id) });
    setActionContext(null);
  };
  const requestRecall = () => {
    if (!actionMessage) return;
    setConfirmAction({ type: 'recall', messageId: String(actionMessage.id) });
    setActionContext(null);
  };

  const confirmDestructiveAction = async () => {
    if (!confirmAction) return;
    const target = messages.find((item) => String(item.id) === String(confirmAction.messageId));
    if (!target) {
      setConfirmAction(null);
      showToast('Tin nhắn không còn tồn tại.');
      return;
    }
    setConfirmLoading(true);
    if (String(activeVoiceId) === String(target.id)) setActiveVoiceId(null);
    try {
      if (confirmAction.type === 'delete') {
        const storedIds = await hideMessageLocally(user?.id, conversationId, target.id);
        const nextSet = new Set(storedIds);
        hiddenIdsRef.current = nextSet;
        setHiddenMessageIds(nextSet);
        setMessages((current) => current.filter((item) => String(item.id) !== String(target.id)));
        if (String(replyTarget?.id) === String(target.id)) setReplyTarget(null);
        if (String(editTarget?.id) === String(target.id)) {
          setEditTarget(null);
          setText('');
        }
        if (String(activeMedia?.messageId) === String(target.id)) setActiveMedia(null);
        showToast('Tin nhắn đã bị ẩn trên thiết bị này.');
      } else {
        const res = await recallMessageApi(target.id);
        upsertMessage(res.data);
        showToast('Đã thu hồi tin nhắn.');
      }
      setConfirmAction(null);
    } catch (err) {
      showToast(err.message || 'Không thể hoàn tất thao tác.');
      if (confirmAction.type === 'recall') load();
    } finally {
      setConfirmLoading(false);
    }
  };

  const composerContext = editTarget ? {
    type: 'edit', label: 'Chỉnh sửa tin nhắn', title: 'Tin nhắn của bạn', body: editTarget.content,
  } : replyTarget ? {
    type: 'reply', label: 'Đang trả lời', title: replyTarget.sender?.name || (Number(replyTarget.sender_id) === Number(user?.id) ? 'Bạn' : title), body: replyTarget.content || (replyTarget.type === 'voice' ? 'Tin nhắn thoại' : 'Nội dung đính kèm'),
  } : null;

  if (loading) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><LoadingState variant="message" count={7} /></View>;
  }
  if (loadError) {
    return <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}><ErrorState title="Không tải được cuộc trò chuyện" message={loadError} onRetry={load} /></View>;
  }
  if (!chatHydrated) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><LoadingState variant="message" count={7} /></View>;
  }

  const confirmIsDelete = confirmAction?.type === 'delete';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConnectionBanner connected={connected} />
      <FlatList
        ref={listRef}
        style={styles.list}
        data={displayMessages}
        keyExtractor={(item) => String(item.message.id)}
        renderItem={({ item }) => {
          const mine = Number(item.message.sender_id) === Number(user?.id);
          return (
            <View>
              {item.showDate ? <DateSeparator value={item.message.created_at} /> : null}
              <MessageBubble
                message={item.message}
                mine={mine}
                clusterPosition={item.clusterPosition}
                showSender={item.showSender}
                showAvatar={item.showAvatar}
                showMeta={item.showMeta}
                showStatus={String(item.message.id) === String(lastOutgoingMessageId)}
                onLongPress={openMessageActions}
                onOpenMedia={openMedia}
                hiddenMessageIds={hiddenMessageIds}
                onRetry={handleSend}
                activeVoiceId={activeVoiceId}
                onVoicePlaybackChange={setActiveVoiceId}
              />
            </View>
          );
        }}
        contentContainerStyle={[styles.messages, displayMessages.length === 0 && styles.emptyMessages]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => scrollToLatest(false)}
        onLayout={() => scrollToLatest(false)}
        ListEmptyComponent={conversation?.type === 'private' && serverMessageCount === 0 ? (
          <FriendshipChatStarter
            friend={otherMember?.user}
            onComposeGreeting={() => {
              setText((current) => current.trim() ? current : 'Xin chào 👋');
              setSendError('');
            }}
          />
        ) : (
          <EmptyState icon="chatbubble-ellipses-outline" title="Bắt đầu cuộc trò chuyện" description="Gửi lời chào, chọn một tấm ảnh hoặc ghi tin nhắn thoại." />
        )}
      />

      <Animated.View style={[styles.composerShell, composerPaddingStyle, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
        {conversationDetails.error || conversation?.permissions_status === 'unavailable' ? <Pressable accessibilityRole="button" accessibilityLabel="Tải lại quyền trò chuyện" onPress={() => conversationDetails.refresh({ invalidate: true }).catch(() => {})} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg }}><Text style={{ color: colors.primary }}>Tải lại quyền trò chuyện</Text></Pressable> : null}
        <MessageComposer
          value={text}
          onChangeText={(value) => { setText(value); setSendError(''); }}
          onSend={handleSend}
          onAttachment={() => setShowAttachmentMenu(true)}
          sending={sending}
          disabled={!connected}
          canSendText={capabilities.send_text_messages === true}
          canSendPhoto={capabilities.send_photos === true || canSendVideo}
          canSendVoice={capabilities.send_voice_messages === true}
          restriction={!permissionsKnown || conversation?.permissions_status === 'unavailable' ? 'Chưa xác minh được quyền. Đang chờ cập nhật từ máy chủ.' : !capabilities.send_text_messages ? 'Nhóm đã hạn chế gửi văn bản. Bản nháp được giữ lại.' : !capabilities.send_photos || !capabilities.send_voice_messages ? 'Một số loại phương tiện đã bị nhóm trưởng hạn chế.' : undefined}
          context={composerContext}
          onCancelContext={cancelComposerContext}
          error={sendError}
          onRetry={text.trim() ? handleSend : undefined}
          onFocus={() => scrollToLatest(true)}
          voice={{
            phase: voiceRecorder.phase,
            durationMillis: voiceRecorder.durationMillis,
            preview: voiceRecorder.preview,
            error: voiceRecorder.error,
            permissionBlocked: voiceRecorder.permissionBlocked,
            onStart: startVoiceRecording,
            onStop: () => voiceRecorder.stopRecording(),
            onCancel: voiceRecorder.cancelRecording,
            onSend: sendVoiceRecording,
            onOpenSettings: () => Linking.openSettings(),
            playbackOwner: activeVoiceId,
            onPreviewPlay: setActiveVoiceId,
          }}
        />
      </Animated.View>
      <Animated.View style={keyboardSpacerStyle} pointerEvents="none" />

      <MessageActionSheet
        visible={!!actionMessage}
        message={actionMessage}
        selectedAttachment={selectedActionAttachment}
        currentUserId={user?.id}
        isAdmin={isGroup && myMember?.role === 'admin'}
        canEdit={capabilities.send_text_messages === true}
        canReact={capabilities.react === true}
        busyAction={actionBusy}
        onClose={() => setActionContext(null)}
        onReply={startReply}
        onForward={openForward}
        onCopy={copyMessage}
        onEdit={startEdit}
        onDelete={requestDelete}
        onRecall={requestRecall}
        onReaction={toggleReaction}
        onDownload={(attachment) => downloadAttachments([attachment])}
        onDownloadAll={downloadAttachments}
      />

      <ForwardMessageSheet
        visible={!!forwardMessage}
        currentConversationId={conversationId}
        currentUserId={user?.id}
        sending={forwarding}
        actionError={forwardError}
        onClose={() => {
          if (forwarding) return;
          setForwardMessageId(null);
          setForwardError('');
        }}
        onForward={forwardToConversation}
      />

      <ImageViewer
        visible={!!activeMedia}
        uri={resolveMediaUrl(activeMedia?.attachment?.file_url)}
        onClose={() => setActiveMedia(null)}
        onLongPress={() => {
          const message = messages.find((item) => String(item.id) === String(activeMedia?.messageId));
          if (message && activeMedia?.attachment) openMessageActions(message, activeMedia.attachment);
        }}
      />

      <BottomSheet visible={showAttachmentMenu} onClose={() => setShowAttachmentMenu(false)} title="Gửi phương tiện" description="Ảnh tối đa 10 MB · Video MP4/MOV tối đa 25 MB">
        <SettingsRow icon="image-outline" label="Gửi ảnh" disabled={!capabilities.send_photos || sending || !connected} onPress={() => handlePickImage(false)} />
        <SettingsRow icon="videocam-outline" label="Gửi video" description={!canSendVideo && isGroup ? 'Nhóm cần cho phép phương tiện, ảnh và thoại để gửi video.' : 'Chọn một video từ thư viện'} disabled={!canSendVideo || sending || !connected} onPress={() => handlePickImage(true)} />
      </BottomSheet>


      <ConfirmationDialog
        visible={!!confirmAction}
        title={confirmIsDelete ? 'Xóa tin nhắn trên thiết bị?' : 'Thu hồi tin nhắn?'}
        message={confirmIsDelete ? 'Tin nhắn chỉ bị ẩn với tài khoản này trên thiết bị hiện tại. Thao tác không đánh dấu tin là đã đọc.' : 'Nội dung sẽ được thay bằng thông báo đã thu hồi đối với mọi thành viên.'}
        confirmLabel={confirmIsDelete ? 'Xóa trên máy' : 'Thu hồi'}
        danger
        loading={confirmLoading}
        onConfirm={confirmDestructiveAction}
        onCancel={() => setConfirmAction(null)}
      />

      <ToastMessage
        message={toast?.message}
        actionLabel={toast?.actionLabel}
        onAction={toast?.onAction}
        onDismiss={dismissToast}
        duration={toast?.duration}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center' },
  list: { flex: 1 },
  headerTitle: { maxWidth: 210, minHeight: 30, flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  headerName: { fontFamily: typography.family.display, fontSize: 14, lineHeight: 16, fontWeight: typography.weight.semibold, letterSpacing: 0 },
  headerStatus: { fontFamily: typography.family.body, fontSize: 10, lineHeight: 12, marginTop: spacing.none },
  headerAction: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  messages: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  emptyMessages: { flexGrow: 1, justifyContent: 'center' },
  composerShell: { borderTopWidth: StyleSheet.hairlineWidth },
  sheetRows: { overflow: 'hidden', borderRadius: radius.lg },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
