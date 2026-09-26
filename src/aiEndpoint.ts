export const CLOUDFLARE_AI_ENDPOINT='https://hanoi-one-day-ai.hanoi-one-day.workers.dev';
export const TENCENT_AI_ENDPOINT='https://1496357497-6iqkre8e7w.ap-beijing.tencentscf.com';

export function selectAiEndpoint(mode:string,override:string|undefined,userAgent:string):string{
  if(override)return override.replace(/\/$/,'');
  if(mode==='test')return '';
  return /Android|iPhone|iPod|iPad|Mobile/i.test(userAgent)?TENCENT_AI_ENDPOINT:CLOUDFLARE_AI_ENDPOINT;
}
