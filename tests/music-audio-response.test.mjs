import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicAudioResponse } from '../workers-backend/src/routes/music.js';

test('旧 Base64 音频支持按字节范围读取', async () => {
  const response = createMusicAudioResponse(
    'data:audio/mpeg;base64,AQIDBAU=',
    'bytes=1-3'
  );

  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 1-3/5');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2, 3, 4]);
});
