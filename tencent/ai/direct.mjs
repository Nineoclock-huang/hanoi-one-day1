// Bundle this entry point for Tencent SCF. The DeepSeek key is read at runtime
// from SCF's private environment variables; it must never enter this bundle.
import aiWorker from '../../worker/src/index.js';

function json(statusCode, body, origin = '') {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
    body: JSON.stringify(body),
  };
}

export async function main_handler(event) {
  const method = event?.httpMethod || '';
  const path = event?.path || '/';
  const originEntry = Object.entries(event?.headers || {}).find(([key]) => key.toLowerCase() === 'origin');
  const origin = originEntry ? String(originEntry[1]) : '';
  const allowedOrigin = origin === 'https://nineoclock-huang.github.io' || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (method === 'GET' && path === '/health') {
    return json(200, { ok: true, provider: 'tencent-scf', configured: Boolean(process.env.DEEPSEEK_API_KEY) }, allowedOrigin ? origin : '');
  }
  if (method === 'GET' && path === '/provider-health') {
    try {
      const response = await fetch('https://api.deepseek.com/models', { signal: AbortSignal.timeout(4000) });
      return json(200, { reachable: true, provider: 'deepseek', status: response.status }, allowedOrigin ? origin : '');
    } catch {
      return json(502, { reachable: false, provider: 'deepseek' }, allowedOrigin ? origin : '');
    }
  }
  if (!allowedOrigin) return json(403, { error: 'Origin not allowed' });
  if (!['POST', 'OPTIONS'].includes(method) || !['/chat', '/report', '/market'].includes(path)) {
    return json(404, { error: 'Not found' }, origin);
  }

  const raw = event?.isBase64Encoded
    ? Buffer.from(String(event.body || ''), 'base64').toString('utf8')
    : String(event?.body || '');
  if (Buffer.byteLength(raw, 'utf8') > 16_384) return json(413, { error: 'Request too large' }, origin);

  try {
    const request = new Request(`https://ai.internal${path}`, {
      method,
      headers: { Origin: origin, 'Content-Type': 'text/plain;charset=UTF-8' },
      ...(method === 'POST' ? { body: raw } : {}),
      signal: AbortSignal.timeout(path === '/report' ? 20_000 : path === '/market' ? 12_000 : 10_000),
    });
    const response = await aiWorker.fetch(request, { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY }, {});
    const text = await response.text();
    if (text.length > 65_536) return json(502, { error: 'AI response too large' }, origin);
    return { statusCode: response.status, headers: Object.fromEntries(response.headers), body: text };
  } catch {
    return json(502, { error: 'AI unavailable' }, origin);
  }
}
