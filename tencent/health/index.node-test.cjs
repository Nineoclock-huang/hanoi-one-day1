const { test } = require('node:test');
const assert = require('node:assert/strict');
const main_handler = async event => (await import('./index.mjs')).main_handler(event);

test('GET returns a credential-free health response', async () => {
  const response = await main_handler({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true, provider: 'tencent-scf', probe: true });
  assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://nineoclock-huang.github.io');
  assert.equal(response.headers['Content-Disposition'], 'inline');
});

test('view route returns a readable phone page', async () => {
  const response = await main_handler({ httpMethod: 'GET', path: '/view' });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /^text\/html/);
  assert.match(response.body, /连接成功/);
});

test('other methods cannot use the health probe', async () => {
  const response = await main_handler({ httpMethod: 'POST' });
  assert.equal(response.statusCode, 405);
});
