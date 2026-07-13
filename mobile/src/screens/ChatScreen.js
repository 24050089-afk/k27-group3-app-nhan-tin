import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getConversationApi,
  getMessagesApi,
  markConversationSeenApi,
  recallMessageApi,
  reactToMessageApi,
  sendMessageApi,
} from '../api/conversation.api';
import { getSocket } from '../api/socket';
import { MAX_CHAT_IMAGE_SIZE, uploadChatImageApi } from '../api/upload.api';
import MessageBubble from '../components/MessageBubble';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

export default function ChatScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const listRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const composerPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value > 0 ? 8 : insets.bottom,
  }), [insets.bottom]);

  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: keyboard.height.value,
  }));

  const upsertMessage = useCallback((incoming) => {
    if (!incoming?.id) return;
    setMessages((current) => {
      const incomingId = String(incoming.id);
      const index = current.findIndex((item) => String(item.id) === incomingId);
      if (index >= 0) {
        const next = [...current];
        next[index] = incoming;
        return next;
      }
      return [...current, incoming];
    });
  }, []);

  const title = conversation?.type === 'group'
    ? conversation?.name || 'Nhóm chat'
    : conversation?.members?.find((item) => item.user_id !== user?.id)?.user?.name || 'Chat';

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const load = useCallback(async () => {
    try {
      const [conversationRes, messageRes] = await Promise.all([
        getConversationApi(conversationId),
        getMessagesApi(conversationId, { page: 1, limit: 50 }),
      ]);
      setConversation(conversationRes.data);
      setMessages(messageRes.data || []);
      markConversationSeenApi(conversationId).catch(() => {});
    } catch (err) {
      Alert.alert('Không tải được cuộc trò chuyện', `${err.message}\n\nKiểm tra kết nối rồi thử lại.`);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleNewMessage = ({ conversationId: incomingConversationId, message }) => {
      if (Number(incomingConversationId) !== Number(conversationId)) return;
      upsertMessage(message);
    };

    const handleUpdatedMessage = ({ conversationId: incomingConversationId, message }) => {
      if (Number(incomingConversationId) !== Number(conversationId)) return;
      upsertMessage(message);
    };

    const handleConversationSeen = ({ conversationId: incomingConversationId, userId, messageId }) => {
      if (Number(incomingConversationId) !== Number(conversationId)) return;
      if (Number(userId) === Number(user?.id)) return;

      setMessages((current) => current.map((message) => (
        message.sender_id === user?.id && Number(message.id) <= Number(messageId)
          ? { ...message, outgoing_status: 'seen' }
          : message
      )));
    };

    socket.emit('conversation:join', { conversationId });
    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('conversation:seen', handleConversationSeen);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('conversation:seen', handleConversationSeen);
    };
  }, [conversationId, upsertMessage, user?.id]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages.length]);

  const scrollToLatest = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSending(true);
    setText('');
    try {
      const res = await sendMessageApi(conversationId, { content, type: 'text' });
      upsertMessage(res.data);
    } catch (err) {
      setText(content);
      Alert.alert('Không gửi được tin nhắn', `${err.message}\n\nNội dung vẫn được giữ để bạn thử lại.`);
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSending(true);
    let stage = 'picker';

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_CHAT_IMAGE_SIZE) {
        Alert.alert('Ảnh quá lớn', 'Chọn ảnh có dung lượng không quá 10 MB.');
        return;
      }
      stage = 'upload';
      const uploaded = await uploadChatImageApi(asset);
      stage = 'message';
      const res = await sendMessageApi(conversationId, {
        content: '',
        type: 'image',
        attachments: [uploaded.data],
      });
      upsertMessage(res.data);
    } catch (err) {
      const guidance = {
        picker: 'Đóng thư viện ảnh rồi thử chọn lại.',
        upload: 'Kiểm tra kết nối hoặc thử ảnh nhỏ hơn.',
        message: 'Ảnh đã tải lên nhưng chưa tạo được tin nhắn. Hãy thử gửi lại.',
      }[stage];
      Alert.alert('Không gửi được ảnh', `${err.message}\n\n${guidance}`);
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const openMessageActions = (message) => {
    const mine = message.sender_id === user?.id;
    const actions = [
      { text: 'Thả tim', onPress: () => reactToMessageApi(message.id, 'heart').then((res) => upsertMessage(res.data)).catch(() => {}) },
      { text: 'Thích', onPress: () => reactToMessageApi(message.id, 'like').then((res) => upsertMessage(res.data)).catch(() => {}) },
    ];
    if (mine && !message.recalled) {
      actions.push({
        text: 'Thu hồi',
        style: 'destructive',
        onPress: () => recallMessageApi(message.id).then((res) => upsertMessage(res.data)).catch((err) => Alert.alert('Không thể thu hồi', err.message)),
      });
    }
    actions.push({ text: 'Hủy', style: 'cancel' });
    Alert.alert('Tùy chọn tin nhắn', undefined, actions);
  };

  const composerContent = (
    <>
      <TouchableOpacity
        style={[styles.toolButton, { backgroundColor: colors.primarySoft }]}
        onPress={handlePickImage}
        disabled={sending}
        accessibilityRole="button"
        accessibilityLabel="Gửi ảnh"
      >
        <Ionicons name="image-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => scrollToLatest()}
        placeholder="Tin nhắn"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
        multiline
        textAlignVertical="top"
        blurOnSubmit={false}
        accessibilityLabel="Nội dung tin nhắn"
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: colors.primary },
          (!text.trim() || sending) && { backgroundColor: colors.border },
        ]}
        onPress={handleSend}
        disabled={!text.trim() || sending}
        accessibilityRole="button"
        accessibilityLabel="Gửi tin nhắn"
      >
        {sending
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Ionicons name="send" size={18} color="#FFFFFF" />}
      </TouchableOpacity>
    </>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            mine={item.sender_id === user?.id}
            onLongPress={() => openMessageActions(item)}
          />
        )}
        contentContainerStyle={[
          styles.messages,
          messages.length === 0 && styles.emptyMessages,
          { paddingBottom: 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => scrollToLatest(false)}
        onLayout={() => scrollToLatest(false)}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Bắt đầu cuộc trò chuyện</Text>
            <Text style={[styles.empty, { color: colors.textMuted }]}>Gửi lời chào hoặc một tấm ảnh.</Text>
          </View>
        )}
      />
      <Animated.View
        style={[
          styles.composer,
          composerPaddingStyle,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        {composerContent}
      </Animated.View>
      <Animated.View style={keyboardSpacerStyle} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { paddingTop: 12 },
  emptyMessages: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  empty: { textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 9,
    borderTopWidth: 1,
  },
  toolButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    fontSize: 15,
  },
  sendButton: {
    height: 38,
    width: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
});
