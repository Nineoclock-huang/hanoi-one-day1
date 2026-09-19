import type {Assessment,Criteria,OrderTarget} from './engine';

export type DialogueMessage={role:'clerk'|'user';vi:string;zh?:string};
export type ClerkMood='neutral'|'listening'|'happy'|'clarify';
export type AiReply={vi:string;zh:string;attempts?:Partial<Assessment>;mood?:ClerkMood};
export type AiFeedback={languageScore:number;grammar:string;vocabulary:string;naturalness:string;advice:string[]};
const defaultEndpoint=import.meta.env.MODE==='test'?'':'https://hanoi-one-day-ai.hanoi-one-day.workers.dev';
const endpoint=((import.meta.env.VITE_AI_ENDPOINT as string|undefined)||defaultEndpoint).replace(/\/$/,'');
export const isAiConfigured=Boolean(endpoint);

export async function requestAiReply(input:{messages:DialogueMessage[];target:OrderTarget;criteria:Criteria;assessment:Assessment;beforeAssessment:Assessment;suggestedReply:AiReply;task:string;clerk?:'Lạc'|'Dận';difficulty?:'standard'|'rush'}):Promise<AiReply|null>{
  if(!endpoint)return null;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch(`${endpoint}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({
      messages:input.messages.slice(-4).map(message=>({role:message.role,vi:message.vi})),
      target:input.target,
      criteria:input.criteria,
      assessment:input.assessment,
      beforeAssessment:input.beforeAssessment,
      suggestedReply:input.suggestedReply,
      task:input.task,
      clerk:input.clerk||'Lạc',
      difficulty:input.difficulty||'standard',
    })});
    if(!response.ok)return null;
    const data=await response.json() as Partial<AiReply>;
    if(typeof data.vi!=='string'||typeof data.zh!=='string'||!data.vi.trim()||!data.zh.trim())return null;
    const attempts=Object.fromEntries((['product','quantity','sugar','service','payment']as const).filter(key=>data.attempts?.[key]==='correct'||data.attempts?.[key]==='incorrect').map(key=>[key,data.attempts?.[key]])) as Partial<Assessment>;
    const mood=(['neutral','listening','happy','clarify'] as const).includes(data.mood as ClerkMood)?data.mood as ClerkMood:undefined;
    return{vi:data.vi.trim().slice(0,320),zh:data.zh.trim().slice(0,240),attempts,mood};
  }catch{return null}finally{window.clearTimeout(timeout)}
}

export async function requestAiFeedback(input:{messages:DialogueMessage[];target:OrderTarget;assessment:Assessment;difficulty?:'standard'|'rush';responseTimes?:number[];timeouts?:number}):Promise<AiFeedback|null>{
  if(!endpoint)return null;
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),18000);
  try{
    const response=await fetch(`${endpoint}/report`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({...input,messages:input.messages.slice(-20)})});
    if(!response.ok)return null;
    const data=await response.json() as Partial<AiFeedback>;
    if(typeof data.languageScore!=='number'||!Number.isFinite(data.languageScore)||typeof data.grammar!=='string'||typeof data.vocabulary!=='string'||typeof data.naturalness!=='string'||!Array.isArray(data.advice))return null;
    return{languageScore:Math.max(0,Math.min(25,Math.round(data.languageScore))),grammar:data.grammar.slice(0,240),vocabulary:data.vocabulary.slice(0,240),naturalness:data.naturalness.slice(0,240),advice:data.advice.filter((item):item is string=>typeof item==='string').slice(0,3).map(item=>item.slice(0,180))};
  }catch{return null}finally{window.clearTimeout(timeout)}
}
