import test from 'node:test';
import assert from 'node:assert/strict';
import { generateToken, verifyToken } from '../workers-backend/src/auth.js';
import { visitorId } from '../workers-backend/src/lib/visitorId.js';
import comments from '../workers-backend/src/routes/comments.js';
import visits from '../workers-backend/src/routes/visits.js';
const secret = 'test-only-independent-key-with-32-characters';
test('authentication fails closed without a strong secret', async () => {
  for (const key of [undefined, '', 'short']) {
    await assert.rejects(generateToken({ role: 'admin' }, key, {}));
    assert.equal(await verifyToken('any.token.value', key), null);
  }
  const token = await generateToken({ userId: 1, role: 'admin' }, secret);
  assert.equal((await verifyToken(token, secret)).userId, 1);
  assert.equal(await verifyToken(token, secret + 'wrong'), null);
  assert.equal(await verifyToken(token.slice(0, -8) + 'tampered', secret), null);
});
test('statistics pseudonym changes every day and never contains the IP', async () => {
  const a = await visitorId('192.0.2.1', secret, '2026-09-13');
  assert.equal(a, await visitorId('192.0.2.1', secret, '2026-09-13'));
  assert.notEqual(a, await visitorId('192.0.2.1', secret, '2026-09-14'));
  assert.notEqual(a, await visitorId('192.0.2.2', secret, '2026-09-13'));
  assert.ok(a.length <= 45 && !a.includes('192.0.2.1'));
});
test('public comment query excludes email; statistics require consent', async () => {
  const original = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.hostname, 'audit.invalid');
    queries.push(url);
    return new Response('[]', { headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' } });
  };
  const env = { SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'test-only', JWT_SECRET: secret };
  try {
    assert.equal((await comments.request('/1', {}, env)).status, 200);
    assert.ok(!queries[0].searchParams.get('select').split(',').includes('email'));
    const count = queries.length;
    await visits.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page_path: '/' }) }, env);
    assert.equal(queries.length, count);
  } finally { globalThis.fetch = original; }
});
