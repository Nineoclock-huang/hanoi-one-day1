import type {Criteria,OrderTarget} from './engine';

export type DialogueMessage={role:'clerk'|'user';vi:string;zh?:string};
export type AiReply={vi:string;zh:string;recognized?:Partial<Criteria>};
const defaultEndpoint=import.meta.env.MODE==='test'?'':'https://hanoi-one-day-ai.hanoi-one-day.workers.dev';
const endpoint=((import.meta.env.VITE_AI_ENDPOINT as string|undefined)||defaultEndpoint).replace(/\/$/,'');
export const isAiConfigured=Boolean(endpoint);

export async function requestAiReply(input:{messages:DialogueMessage[];target:OrderTarget;criteria:Criteria;suggestedReply:AiReply;task:string}):Promise<AiReply|null>{
  if(!endpoint)return null;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),35000);
  try{
    const response=await fetch(`${endpoint}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({
      messages:input.messages.slice(-10).map(message=>({role:message.role,vi:message.vi})),
      target:input.target,
      criteria:input.criteria,
      suggestedReply:input.suggestedReply,
      task:input.task,
    })});
    if(!response.ok)return null;
    const data=await response.json() as Partial<AiReply>;
    if(typeof data.vi!=='string'||typeof data.zh!=='string'||!data.vi.trim()||!data.zh.trim())return null;
    const recognized=Object.fromEntries((['product','quantity','sugar','service','payment']as const).filter(key=>data.recognized?.[key]===true).map(key=>[key,true])) as Partial<Criteria>;
    return{vi:data.vi.trim().slice(0,320),zh:data.zh.trim().slice(0,240),recognized};
  }catch{return null}finally{window.clearTimeout(timeout)}
}
