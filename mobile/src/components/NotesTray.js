import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createNoteApi,
  deleteNoteApi,
  getMyNoteApi,
  getNoteApi,
  getNotesFeedApi,
  replyToNoteApi,
} from '../api/note.api';
import { getFriendsApi } from '../api/social.api';
import { getSocket } from '../api/socket';
import Avatar from './Avatar';
import NoteComposerSheet from './NoteComposerSheet';
import NoteViewerModal from './NoteViewerModal';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { componentState, iconSize, radius, spacing, touchTarget, typography } from '../theme/tokens';

const noteContent = (note) => [note?.emoji, note?.text].filter(Boolean).join(' ');

function NoteBubbleAvatar({ note, user, mine, onPress }) {
  const { colors } = useTheme();
  const content = noteContent(note);

  return (
    <Pressable
      style={({ pressed }) => [styles.noteItem, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={mine ? 'Tạo hoặc xem tin ghi chú của bạn' : `Xem tin ghi chú của ${note.authorName}`}
    >
      <View style={[styles.bubble, { backgroundColor: colors.surfaceRaised, borderColor: note ? colors.primary : colors.border }]}>
        {note ? (
          <Text style={[styles.bubbleText, { color: colors.text }]} numberOfLines={2}>{content}</Text>
        ) : (
          <Ionicons name="add" size={iconSize.sm} color={colors.primary} />
        )}
      </View>
      <Avatar
        user={mine ? user : { name: note.authorName, username: note.authorUsername, avatar: note.authorAvatarUrl }}
        size={54}
        showStatus={!mine}
      />
      <Text style={[styles.name, { color: colors.textMuted }]} numberOfLines={1}>{mine ? 'Bạn' : note.authorName}</Text>
    </Pressable>
  );
}

export default function NotesTray({ navigation, onChanged }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [myNote, setMyNote] = useState(null);
  const [notes, setNotes] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, feedRes] = await Promise.all([
        getMyNoteApi(),
        getNotesFeedApi({ limit: 20 }),
      ]);
      setMyNote(mineRes.data || null);
      setNotes(feedRes.data?.items || []);
    } catch {
      setMyNote(null);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await getFriendsApi();
      setFriends(res.data || []);
    } catch {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const refresh = () => loadNotes();
    socket.on('note:created', refresh);
    socket.on('note:deleted', refresh);
    return () => {
      socket.off('note:created', refresh);
      socket.off('note:deleted', refresh);
    };
  }, [loadNotes]);

  const openComposer = () => {
    setError('');
    setComposerVisible(true);
    if (!friends.length) loadFriends();
  };

  const openNote = async (note) => {
    setError('');
    try {
      const res = await getNoteApi(note.id);
      setSelectedNote(res.data);
      setViewerVisible(true);
      setNotes((current) => current.map((item) => Number(item.id) === Number(note.id) ? res.data : item));
    } catch (err) {
      setError(err.message);
    }
  };

  const createNote = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await createNoteApi(payload);
      setMyNote(res.data);
      setComposerVisible(false);
      await loadNotes();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (note) => {
    setSubmitting(true);
    setError('');
    try {
      await deleteNoteApi(note.id);
      setViewerVisible(false);
      setSelectedNote(null);
      setMyNote(null);
      await loadNotes();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const replyToNote = async (note, message) => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await replyToNoteApi(note.id, message.trim());
      setViewerVisible(false);
      setSelectedNote(null);
      if (res.data?.threadId) {
        navigation.navigate('Chat', { conversationId: res.data.threadId });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleNotes = useMemo(() => notes.filter((note) => Number(note.authorId) !== Number(user?.id)), [notes, user?.id]);
  const selectedIsMine = selectedNote && Number(selectedNote.authorId) === Number(user?.id);

  return (
    <View style={[styles.container, { borderBottomColor: colors.divider }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Tin ghi chú</Text>
        {error ? <Text style={[styles.inlineError, { color: colors.danger }]} numberOfLines={1}>{error}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        <NoteBubbleAvatar note={myNote} user={user} mine onPress={myNote ? () => { setSelectedNote(myNote); setViewerVisible(true); } : openComposer} />
        {!loading && visibleNotes.map((note) => (
          <NoteBubbleAvatar key={note.id} note={note} onPress={() => openNote(note)} />
        ))}
        {loading ? (
          <View style={styles.loadingRow}>
            {[0, 1, 2].map((item) => <View key={item} style={[styles.skeleton, { backgroundColor: colors.skeleton }]} />)}
          </View>
        ) : null}
      </ScrollView>

      <NoteComposerSheet
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onSubmit={createNote}
        friends={friends}
        loadingFriends={friendsLoading}
        error={error}
        submitting={submitting}
      />
      <NoteViewerModal
        visible={viewerVisible}
        note={selectedNote}
        isMine={!!selectedIsMine}
        onClose={() => { if (!submitting) setViewerVisible(false); }}
        onReply={replyToNote}
        onDelete={deleteNote}
        loading={submitting}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  title: { fontFamily: typography.family.display, fontSize: typography.size.titleSmall, fontWeight: typography.weight.heavy },
  inlineError: { flex: 1, fontFamily: typography.family.body, fontSize: typography.size.caption },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  noteItem: { width: 84, alignItems: 'center', minHeight: 126 },
  bubble: { minHeight: 40, maxHeight: 52, minWidth: 52, maxWidth: 82, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center', justifyContent: 'center', marginBottom: -spacing.xs, zIndex: 1 },
  bubbleText: { fontFamily: typography.family.body, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, fontWeight: typography.weight.semibold, textAlign: 'center' },
  name: { marginTop: spacing.xs, fontFamily: typography.family.body, fontSize: typography.size.caption, maxWidth: 80 },
  loadingRow: { flexDirection: 'row', gap: spacing.md, paddingLeft: spacing.xs },
  skeleton: { width: 64, height: 96, borderRadius: radius.lg, opacity: componentState.skeletonMinOpacity },
  pressed: { transform: [{ scale: componentState.pressedScale }] },
});
