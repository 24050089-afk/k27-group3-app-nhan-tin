const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const modelPath = require.resolve('../src/models');
const servicePath = require.resolve('../src/services/groupPermission.service');
const calls = [];
let authorized = true;
const transaction = { fixture: true };
require.cache[modelPath] = { id: modelPath, loaded: true, exports: {
  Message: {},
  sequelize: { transaction: async (fn) => fn(transaction) },
  Attachment: {
    count: async (query) => { calls.push(query); return query.where.file_type[Op.like] === 'image/%' ? 3 : 1; },
    findAll: async (query) => { calls.push(query); return [{ id: 5, file_type: 'image/jpeg' }]; },
  },
} };
require.cache[servicePath] = { id: servicePath, loaded: true, exports: {
  lockConversationAccess: async (id, userId, txn) => {
    assert.equal(id, 12); assert.equal(userId, 7); assert.equal(txn, transaction);
    if (!authorized) throw Object.assign(new Error('Not found'), { status: 404, code: 'CONVERSATION_NOT_FOUND' });
  },
} };
const { listConversationMedia } = require('../src/controllers/conversationMedia.controller');
const run = async (query = {}) => {
  let data, error;
  await listConversationMedia({ params: { id: '12' }, user: { id: 7 }, query }, { json: (body) => { data = body.data; } }, (err) => { error = err; });
  return { data, error };
};

test('shared media gates all queries by membership and excludes recalled in count and page queries', async () => {
  const { data, error } = await run({ page: '2', limit: '2' });
  assert.equal(error, undefined);
  assert.deepEqual(data.counts, { images: 3, videos: 1 });
  assert.equal(data.has_more, false);
  assert.equal(data.total, 3);
  assert.equal(calls.at(-1).offset, 2);
  for (const query of calls) {
    assert.deepEqual(query.include[0].where, { conversation_id: 12, recalled: false });
    assert.equal(query.transaction, transaction);
  }
  calls.length = 0;
  authorized = false;
  assert.equal((await run()).error.code, 'CONVERSATION_NOT_FOUND');
  assert.equal(calls.length, 0);
  authorized = true;
});

test('invalid media pagination and types fail before database access', async () => {
  calls.length = 0;
  for (const query of [{ page: '-1' }, { page: '1.5' }, { limit: '101' }, { type: 'file' }, { page: 'Infinity' }]) {
    assert.equal((await run(query)).error.code, 'INVALID_MEDIA_QUERY');
  }
  assert.equal(calls.length, 0);
});
