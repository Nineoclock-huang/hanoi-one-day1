const { test } = require('node:test');
const assert = require('node:assert/strict');
const main_handler = async event => (await import('./index.mjs')).main_handler(event);

const ORIGIN = 'https://nineoclock-huang.github.io';
const event = (path, method = 'POST', body = '{}') => ({ path, httpMethod: method, headers: { origin: ORIGIN }, body });

test('bridge health is available without a model key', async () => {
  const response = await main_handler(event('/health', 'GET'));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).bridge, true);
});

test('upstream health reports whether Tencent can reach the existing Worker', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ ok: true }) });
  try {
    const response = await main_handler(event('/upstream-health', 'GET'));
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).upstream, 'cloudflare-worker');
  } finally {
    global.fetch = original;
  }
});

test('provider health treats an unauthenticated response as network reachability', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ status: 401 });
  try {
    const response = await main_handler(event('/provider-health', 'GET'));
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { reachable: true, provider: 'deepseek', status: 401 });
  } finally {
    global.fetch = original;
  }
});

test('bridge forwards each AI route without exposing credentials', async () => {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { status: 200, text: async () => JSON.stringify({ vi: 'Vâng.', zh: '好的。' }) };
  };
  try {
    for (const path of ['/chat', '/report', '/market']) {
      const response = await main_handler(event(path, 'POST', JSON.stringify({ sessionId: 'test-session-123456' })));
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['Access-Control-Allow-Origin'], ORIGIN);
      assert.equal(JSON.parse(response.body).vi, 'Vâng.');
    }
    assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/chat', '/report', '/market']);
    assert.ok(calls.every(call => call.options.headers.Origin === ORIGIN));
    assert.ok(calls.every(call => !Object.hasOwn(call.options.headers, 'Authorization')));
  } finally {
    global.fetch = original;
  }
});

test('bridge rejects an untrusted origin, unknown route, and oversized request', async () => {
  assert.equal((await main_handler({ ...event('/report'), headers: { origin: 'https://other.example' } })).statusCode, 403);
  assert.equal((await main_handler(event('/other'))).statusCode, 404);
  assert.equal((await main_handler(event('/report', 'POST', JSON.stringify({ text: 'a'.repeat(17_000) })))).statusCode, 400);
});

test('bridge preserves upstream failures and provides CORS on error', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ status: 502, text: async () => '{"error":"AI unavailable"}' });
  try {
    const response = await main_handler(event('/report'));
    assert.equal(response.statusCode, 502);
    assert.equal(response.headers['Access-Control-Allow-Origin'], ORIGIN);
  } finally {
    global.fetch = original;
  }
});
