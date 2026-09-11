const toEpoch = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const epoch = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : null;
};

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) && id >= 0 ? id : 0;
};

const isPinned = (conversation) => Boolean(conversation?.me?.pinned);

const getLastMessageTimestamp = (conversation) => (
  conversation?.last_message?.created_at ?? conversation?.last_message?.createdAt ?? null
);

const getConversationActivityTimestamp = (conversation) => {
  if (conversation?.last_message) return getLastMessageTimestamp(conversation);
  if (conversation?.type !== 'private') return null;
  return conversation?.created_at ?? conversation?.createdAt ?? null;
};

const compareDescending = (a, b) => {
  if (a === b) return 0;
  return a > b ? -1 : 1;
};

const compareConversationActivity = (a, b) => {
  const pinnedOrder = compareDescending(Number(isPinned(a)), Number(isPinned(b)));
  if (pinnedOrder !== 0) return pinnedOrder;

  const aEpoch = toEpoch(getConversationActivityTimestamp(a));
  const bEpoch = toEpoch(getConversationActivityTimestamp(b));
  const validTimestampOrder = compareDescending(Number(aEpoch !== null), Number(bEpoch !== null));
  if (validTimestampOrder !== 0) return validTimestampOrder;

  if (aEpoch !== null && bEpoch !== null) {
    const timestampOrder = compareDescending(aEpoch, bEpoch);
    if (timestampOrder !== 0) return timestampOrder;
  }

  const aHasMessage = Boolean(a?.last_message);
  const bHasMessage = Boolean(b?.last_message);
  const messagePresenceOrder = compareDescending(Number(aHasMessage), Number(bHasMessage));
  if (messagePresenceOrder !== 0) return messagePresenceOrder;

  if (aHasMessage && bHasMessage) {

    const messageIdOrder = compareDescending(
      normalizeId(a.last_message.id),
      normalizeId(b.last_message.id)
    );
    if (messageIdOrder !== 0) return messageIdOrder;
  }

  return compareDescending(normalizeId(a?.id), normalizeId(b?.id));
};

const sortConversationsByActivity = (items) => [...items].sort(compareConversationActivity);

module.exports = {
  toEpoch,
  normalizeId,
  isPinned,
  getLastMessageTimestamp,
  getConversationActivityTimestamp,
  compareConversationActivity,
  sortConversationsByActivity,
};
