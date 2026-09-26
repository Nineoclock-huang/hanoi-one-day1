import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../public/tencent-check.html', import.meta.url), 'utf8');

async function renderCheck(fetchMock) {
  const page = new JSDOM(html, {
    url: 'https://nineoclock-huang.github.io/hanoi-one-day1/tencent-check.html',
    runScripts: 'dangerously',
    beforeParse(window) { window.fetch = fetchMock; },
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  return page;
}

test('mobile connectivity page verifies a successful response', async () => {
  const page = await renderCheck(async () => ({
    ok: true,
    json: async () => ({ ok: true, provider: 'tencent-scf', probe: true }),
  }));
  assert.match(page.window.document.querySelector('#status').textContent, /连接成功/);
  page.window.close();
});

test('mobile connectivity page reports failures and permits retry', async () => {
  const page = await renderCheck(async () => { throw new Error('offline'); });
  assert.match(page.window.document.querySelector('#status').textContent, /连接失败/);
  assert.equal(page.window.document.querySelector('#retry').disabled, false);
  page.window.close();
});
