import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@lt_mobile_hidden_messages:v1';
const MAX_HIDDEN_MESSAGES = 1000;

const storageKey = (userId, conversationId) => `${KEY_PREFIX}:${String(userId)}:${String(conversationId)}`;

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id) => id !== null && id !== undefined && String(id).length > 0)
    .map((id) => String(id));
};

export const loadHiddenMessageIds = async (userId, conversationId) => {
  if (userId === null || userId === undefined || conversationId === null || conversationId === undefined) return [];
  const key = storageKey(userId, conversationId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messageIds)) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return [];
    }
    const ordered = normalizeIds(parsed?.messageIds);
    const deduplicated = [];
    ordered.forEach((id) => {
      const previousIndex = deduplicated.indexOf(id);
      if (previousIndex >= 0) deduplicated.splice(previousIndex, 1);
      deduplicated.push(id);
    });
    return deduplicated.slice(-MAX_HIDDEN_MESSAGES);
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }
};

export const hideMessageLocally = async (userId, conversationId, messageId) => {
  const id = String(messageId);
  const current = await loadHiddenMessageIds(userId, conversationId);
  const next = current.filter((item) => item !== id);
  next.push(id);
  const limited = next.slice(-MAX_HIDDEN_MESSAGES);
  await AsyncStorage.setItem(storageKey(userId, conversationId), JSON.stringify({
    messageIds: limited,
    updatedAt: Date.now(),
  }));
  return limited;
};

export const getHiddenMessageSet = async (userId, conversationId) => (
  new Set(await loadHiddenMessageIds(userId, conversationId))
);
