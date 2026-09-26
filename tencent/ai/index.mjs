// Tencent SCF event function. Deploy this file as index.mjs with handler index.main_handler.
// It contains no model credentials: only the Tencent server contacts the existing Worker.
const WORKER = 'https://hanoi-one-day-ai.hanoi-one-day.workers.dev';
const ORIGINS = new Set([
  'https://nineoclock-huang.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const PATHS = new Set(['/chat', '/report', '/market']);

function header(event, name) {
  const match = Object.entries(event?.headers || {}).find(([key]) => key.toLowerCase() === name);
  return match ? String(match[1]) : '';
}

function output(statusCode, value, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
    body: JSON.stringify(value),
  };
}

async function main_handler(event) {
  const method = event?.httpMethod || '';
  const path = event?.path || '/';
  const origin = header(event, 'origin');
  if (method === 'GET' && path === '/health') {
    return output(200, { ok: true, provider: 'tencent-scf', bridge: true }, origin);
  }
  if (method === 'GET' && path === '/upstream-health') {
    try {
      const response = await fetch(`${WORKER}/health`, { signal: AbortSignal.timeout(2500) });
      const result = await response.json();
      return output(response.ok && result?.ok === true ? 200 : 502,
        { ok: response.ok && result?.ok === true, upstream: 'cloudflare-worker' }, origin);
    } catch {
      return output(502, { ok: false, upstream: 'cloudflare-worker' }, origin);
    }
  }
  if (method === 'GET' && path === '/provider-health') {
    try {
      // A 401 means DeepSeek was reached; this probe deliberately sends no key.
      const response = await fetch('https://api.deepseek.com/models', { signal: AbortSignal.timeout(4000) });
      return output(200, { reachable: true, provider: 'deepseek', status: response.status }, origin);
    } catch {
      return output(502, { reachable: false, provider: 'deepseek' }, origin);
    }
  }
  if (!ORIGINS.has(origin)) return output(403, { error: 'Origin not allowed' }, origin);
  if (method === 'OPTIONS' && PATHS.has(path)) {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
      body: '',
    };
  }
  if (method !== 'POST' || !PATHS.has(path)) return output(404, { error: 'Not found' }, origin);

  let body;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(String(event.body || ''), 'base64').toString('utf8')
      : String(event.body || '');
    if (!raw || Buffer.byteLength(raw, 'utf8') > 16_384) throw new Error('Invalid size');
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch {
    return output(400, { error: 'Invalid JSON' }, origin);
  }

  try {
    const response = await fetch(`${WORKER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: origin },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(path === '/report' ? 18_000 : path === '/market' ? 10_000 : 8_000),
    });
    const text = await response.text();
    if (text.length > 65_536) throw new Error('Oversized response');
    const result = JSON.parse(text);
    return output(response.status, result, origin);
  } catch {
    return output(502, { error: 'AI bridge unavailable' }, origin);
  }
}

export { main_handler };
