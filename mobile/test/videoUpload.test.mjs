import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/api/upload.api.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');

function harness(size, response = { ok: true, json: async () => ({ data: { file_url: '/video.mp4' } }) }) {
  const calls = [];
  const context = vm.createContext({
    File: class { constructor() { this.size = size; } }, Paths: {},
    API_BASE_URL: 'http://test/api', getToken: async () => 'test-token',
    FormData: class { append(...args) { calls.push(['form', ...args]); } },
    AbortController, setTimeout, clearTimeout,
    fetch: async (...args) => { calls.push(['fetch', ...args]); return response; },
  });
  vm.runInContext(source + '\nthis.upload = uploadChatVideoApi;', context);
  return { upload: context.upload, calls };
}

test('video size boundary accepts 25 MiB and rejects larger or unreadable files before upload', async () => {
  for (const size of [0, -1, 25 * 1024 * 1024 + 1]) {
    const h = harness(size);
    await assert.rejects(h.upload({ uri: 'file:///a.mp4', mimeType: 'video/mp4' }));
    assert.equal(h.calls.length, 0);
  }
  const h = harness(25 * 1024 * 1024);
  await h.upload({ uri: 'file:///a.mp4', mimeType: 'video/mp4' });
  const request = h.calls.find(c => c[0] === 'fetch');
  assert.equal(request[1], 'http://test/api/upload/chat-video');
  assert.equal(request[2].headers.Authorization, 'Bearer test-token');
});

test('unsupported MIME is rejected and server rejection is not retried', async () => {
  const invalid = harness(1024);
  await assert.rejects(invalid.upload({ uri: 'file:///a.webm', mimeType: 'video/webm' }));
  assert.equal(invalid.calls.length, 0);
  const rejected = harness(1024, { ok: false, status: 413, json: async () => ({}) });
  await assert.rejects(rejected.upload({ uri: 'file:///a.mov', mimeType: 'video/quicktime' }), /25 MB/);
  assert.equal(rejected.calls.filter(c => c[0] === 'fetch').length, 1);
});
