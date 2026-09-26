import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main_handler } from './direct.mjs';

const origin = 'https://nineoclock-huang.github.io';
const event = (path, body, method = 'POST') => ({ path, httpMethod: method, headers: { origin }, body: JSON.stringify(body) });

test('direct backend keeps the model key on the server', async () => {
  const response = await main_handler(event('/health', {}, 'GET'));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).provider, 'tencent-scf');
  assert.doesNotMatch(response.body, /sk-[A-Za-z0-9]/);
});

test('direct backend rejects unknown websites and excessive payloads', async () => {
  const wrongOrigin = { ...event('/chat', {}), headers: { origin: 'https://other.example' } };
  assert.equal((await main_handler(wrongOrigin)).statusCode, 403);
  assert.equal((await main_handler(event('/chat', { text: 'x'.repeat(17_000) }))).statusCode, 413);
});

test('direct backend returns AI language advice through Tencent response shape', async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-only-key';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    return new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ languageScore: 19, grammar: '句子完整。', vocabulary: '词汇准确。', naturalness: '自然。', advice: ['继续练习。'] }) } }] } }] }), { status: 200 });
  };
  try {
    const response = await main_handler(event('/report', {
      messages: [{ role: 'user', vi: 'Cho tôi một ly cà phê sữa đá, ít đường, mang đi.' }],
      target: { product: 'milk-iced', quantity: 1, sugar: 'less', service: 'takeaway' },
      assessment: { product: 'correct', quantity: 'correct', sugar: 'correct', service: 'correct', payment: 'correct' },
      sessionId: 'test-session-123456',
    }));
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).languageScore, 19);
    assert.equal(response.headers['access-control-allow-origin'], origin);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  }
});
