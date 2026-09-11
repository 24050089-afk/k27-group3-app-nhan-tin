import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getConversationApi } from '../api/conversation.api';
import { getSocket } from '../api/socket';
import { useAuth } from '../store/AuthContext';

const permissionVersion = (value) => (
  value?.role_permissions?.version ?? value?.member_permissions?.version
);

// A policy version orders policy changes, not membership or management capability.
export default function useConversationDetails(conversationId, initialData = null) {
  const { user } = useAuth();
  const generation = useRef(0);
  const scope = `${user?.id}:${conversationId}`;
  const activeScope = useRef(scope);
  if (activeScope.current !== scope) { activeScope.current = scope; generation.current += 1; }
  const [snapshot, setSnapshot] = useState(() => ({
    scope,
    data: String(initialData?.id) === String(conversationId) ? initialData : null,
  }));
  const data = snapshot.scope === scope ? snapshot.data : null;
  const setData = useCallback((update) => {
    if (activeScope.current !== scope) return;
    setSnapshot((current) => {
      const previous = current.scope === scope ? current.data : null;
      const next = typeof update === 'function' ? update(previous) : update;
      const nextVersion = permissionVersion(next);
      const previousVersion = permissionVersion(previous);
      if (Number.isSafeInteger(nextVersion) && Number.isSafeInteger(previousVersion) && nextVersion < previousVersion) return current;
      return { scope, data: next };
    });
  }, [scope]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifiedScope, setVerifiedScope] = useState(null);
  const refresh = useCallback(async ({ invalidate = false } = {}) => {
    const request = ++generation.current;
    if (invalidate) setVerifiedScope(null);
    setLoading(true);
    try {
      const response = await getConversationApi(conversationId);
      if (request !== generation.current) return null;
      setData(response.data);
      setVerifiedScope(scope);
      setError(null);
      return response.data;
    } catch (err) {
      if (request === generation.current) {
        setError(err);
        setVerifiedScope(null);
        if (err.status === 404 || err.status === 401) setData(null);
      }
      throw err;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [conversationId, user?.id, scope, setData]);

  useFocusEffect(useCallback(() => {
    const reload = () => { refresh({ invalidate: true }).catch(() => {}); };
    const socket = getSocket();
    let timer;
    const changed = (event) => {
      if (String(event?.conversationId) !== String(conversationId) || event?.reason === 'message') return;
      clearTimeout(timer);
      timer = setTimeout(() => { refresh().catch(() => {}); }, 100);
    };
    reload();
    socket?.on('conversation:updated', changed);
    socket?.on('conversation:permissions_updated', changed);
    socket?.on('connect', reload);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => {
      generation.current += 1;
      clearTimeout(timer);
      socket?.off('conversation:updated', changed);
      socket?.off('conversation:permissions_updated', changed);
      socket?.off('connect', reload);
      subscription.remove();
    };
  }, [conversationId, refresh]));

  const invalidate = useCallback(() => { generation.current += 1; }, []);
  return { data, setData, loading, error, refresh, invalidate, verified: verifiedScope === scope };
}
