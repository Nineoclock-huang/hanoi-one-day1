// A credential-free connectivity probe. The game does not call this endpoint.
const view = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>河内的一天 · 连通性检测</title><body style="font:18px/1.6 system-ui,sans-serif;padding:2rem;max-width:34rem;margin:auto;background:#f8f2e8;color:#34281f"><h1>连接成功 ✓</h1><p>你的手机已连接到腾讯云检测接口。</p><p>这只是网络检测，不会调用 AI 或上传聊天内容。</p></body></html>';

export const main_handler = async (event) => {
  const isGet = event?.httpMethod === 'GET';
  const isView = isGet && event.path === '/view';
  return {
    statusCode: isGet ? 200 : 405,
    headers: {
      'Content-Type': isView ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': 'inline',
      'Access-Control-Allow-Origin': 'https://nineoclock-huang.github.io',
      'Cache-Control': 'no-store',
    },
    body: isView ? view : JSON.stringify(isGet ? { ok: true, provider: 'tencent-scf', probe: true } : { error: 'Method not allowed' }),
  };
};
