import {describe,expect,it} from 'vitest';
import {CLOUDFLARE_AI_ENDPOINT,TENCENT_AI_ENDPOINT,selectAiEndpoint} from './aiEndpoint';

describe('AI endpoint routing',()=>{
  it('keeps desktop on the existing Cloudflare endpoint',()=>{
    expect(selectAiEndpoint('production',undefined,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129')).toBe(CLOUDFLARE_AI_ENDPOINT);
  });
  it('routes iPhone WeChat and Android browsers through Tencent',()=>{
    expect(selectAiEndpoint('production',undefined,'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) MicroMessenger')).toBe(TENCENT_AI_ENDPOINT);
    expect(selectAiEndpoint('production',undefined,'Mozilla/5.0 (Linux; Android 15) Mobile')).toBe(TENCENT_AI_ENDPOINT);
  });
  it('honors local overrides and keeps tests isolated',()=>{
    expect(selectAiEndpoint('production','http://127.0.0.1:8787/','iPhone')).toBe('http://127.0.0.1:8787');
    expect(selectAiEndpoint('test',undefined,'iPhone')).toBe('');
  });
});
