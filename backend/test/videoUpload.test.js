const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { hasVideoTrack, MAX_VIDEO_BYTES, validateVideoAttachment } = require('../src/utils/videoUpload');

const box = (type, payload) => {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.length);
  header.write(type, 4);
  return Buffer.concat([header, payload]);
};
const container = (handler = 'vide', brand = 'isom') => Buffer.concat([
  box('ftyp', Buffer.from(`${brand}\0\0\0\0`)),
  box('moov', box('trak', box('mdia', box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from(handler)]))))),
]);

test('video signature requires a video track and rejects audio, forged and truncated boxes', () => {
  assert.equal(hasVideoTrack(container()), true);
  assert.equal(hasVideoTrack(container('vide', 'qt  ')), true);
  assert.equal(hasVideoTrack(container('soun')), false);
  assert.equal(hasVideoTrack(container('vide', 'heic')), false);
  assert.equal(hasVideoTrack(Buffer.from('xxxxftypisom')), false);
  assert.equal(hasVideoTrack(container().subarray(0, -1)), false);
  const corrupt = container();
  corrupt.writeUInt32BE(0xffffffff, 16);
  assert.equal(hasVideoTrack(corrupt), false);
});

test('multipart video upload enforces MIME, actual bytes and 25 MiB limit; rejected files are removed', async () => {
  const originalCwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'proxy-video-test-'));
  let server;
  try {
    process.chdir(directory);
    const authPath = require.resolve('../src/middlewares/auth.middleware');
    require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
      protect: (_req, _res, next) => next(),
    } };
    const express = require('express');
    const app = express();
    app.use('/upload', require('../src/routers/upload.router'));
    app.use(require('../src/middlewares/error.middleware'));
    server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const upload = async (bytes, mime, name = 'clip.mp4') => {
      const form = new FormData();
      form.set('video', new Blob([bytes], { type: mime }), name);
      const response = await fetch(`${base}/upload/chat-video`, { method: 'POST', body: form });
      return { status: response.status, body: await response.json() };
    };
    const accepted = await upload(container(), 'video/mp4');
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.size, container().length);
    assert.equal(accepted.body.data.thumbnail_url, null);
    const attachment = { ...accepted.body.data, size: 1 };
    await validateVideoAttachment(attachment, { get: () => new URL(base).host });
    assert.equal(attachment.size, container().length, 'send uses actual filesystem size');
    for (const scheme of ['custom:', 'ftp:', 'file:']) {
      await assert.rejects(validateVideoAttachment({ ...attachment, file_url: attachment.file_url.replace('http:', scheme) }, { get: () => new URL(base).host }), { code: 'INVALID_VIDEO' });
    }
    await assert.rejects(validateVideoAttachment(attachment, { get: () => 'other-host.test' }), { code: 'INVALID_VIDEO' });
    const wrongMime = await upload(container(), 'image/png');
    assert.equal(wrongMime.status, 415);
    assert.equal(wrongMime.body.code, 'INVALID_VIDEO');
    const audio = await upload(container('soun'), 'video/mp4');
    assert.equal(audio.status, 415);
    assert.equal(audio.body.code, 'INVALID_VIDEO');
    const tooLarge = await upload(Buffer.alloc(MAX_VIDEO_BYTES + 1), 'video/mp4');
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLarge.body.code, 'VIDEO_TOO_LARGE');
    const boundary = Buffer.concat([container(), box('mdat', Buffer.alloc(MAX_VIDEO_BYTES - container().length - 8))]);
    assert.equal((await upload(boundary, 'video/mp4')).status, 201, 'exact size limit is allowed');
    assert.equal((await fs.readdir(path.join(directory, 'uploads', 'chat-videos'))).length, 2);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    process.chdir(originalCwd);
    // Only the freshly created synthetic test directory is removed.
    await fs.rm(directory, { recursive: true, force: true });
  }
});
