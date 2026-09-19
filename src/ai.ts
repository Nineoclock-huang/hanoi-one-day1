import {normalizeVietnamese,type Assessment,type Criteria,type OrderTarget} from './engine';

export type DialogueMessage={role:'clerk'|'user';vi:string;zh?:string};
export type ClerkMood='neutral'|'listening'|'happy'|'clarify';
export type AiReply={vi:string;zh:string;attempts?:Partial<Assessment>;evidence?:Partial<Record<keyof Assessment,string>>;confidence?:Partial<Record<keyof Assessment,number>>;mood?:ClerkMood};
export type AiFeedback={languageScore:number;grammar:string;vocabulary:string;naturalness:string;advice:string[]};
const defaultEndpoint=import.meta.env.MODE==='test'?'':'https://hanoi-one-day-ai.hanoi-one-day.workers.dev';
const endpoint=((import.meta.env.VITE_AI_ENDPOINT as string|undefined)||defaultEndpoint).replace(/\/$/,'');
export const isAiConfigured=Boolean(endpoint);
const SESSION_KEY='hanoi-one-day-ai-session';
let transientSessionId='',warmPromise:Promise<void>|null=null;
const fieldSignals:Record<keyof Assessment,string[]>={
  product:['bac xiu','trung','den','sua'],
  quantity:['mot','hai','1','2','ly','coc'],
  sugar:['duong','ngot'],
  service:['mang','dem','tai cho','tai day','uong o'],
  payment:['thanh toan','tra','tien','the','chuyen khoan','quet'],
};

export function trustedAiAttempts(reply:AiReply|null,input:string):Partial<Assessment>{
  if(!reply?.attempts||!reply.evidence||!reply.confidence)return{};
  const message=normalizeVietnamese(input),result:Partial<Assessment>={};
  for(const key of ['product','quantity','sugar','service','payment'] as const){
    const status=reply.attempts[key],rawEvidence=reply.evidence[key],confidence=reply.confidence[key];
    if((status!=='correct'&&status!=='incorrect')||typeof rawEvidence!=='string'||typeof confidence!=='number'||confidence<.8)continue;
    const evidence=normalizeVietnamese(rawEvidence);
    if(!evidence||!message.includes(evidence)||!fieldSignals[key].some(signal=>evidence.includes(signal)))continue;
    result[key]=status;
  }
  return result;
}

function sessionId(){
  if(transientSessionId)return transientSessionId;
  try{const saved=localStorage.getItem(SESSION_KEY);if(saved&&/^[\w-]{16,80}$/.test(saved))return transientSessionId=saved}catch{}
  transientSessionId=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  try{localStorage.setItem(SESSION_KEY,transientSessionId)}catch{}
  return transientSessionId;
}

const pause=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));
async function post(path:string,payload:object,timeouts:number[]):Promise<Response|null>{
  for(let attempt=0;attempt<timeouts.length;attempt++){
    const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),timeouts[attempt]);
    try{
      // text/plain 属于 CORS 简单请求，可绕过手机网络中最耗时、最不稳定的 OPTIONS 预检。
      const response=await fetch(`${endpoint}${path}`,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},credentials:'omit',cache:'no-store',keepalive:true,signal:controller.signal,body:JSON.stringify({...payload,sessionId:sessionId()})});
      if(response.ok||![429,502,503,504].includes(response.status)||attempt===timeouts.length-1)return response;
    }catch{if(attempt===timeouts.length-1)return null}
    finally{window.clearTimeout(timeout)}
    await pause(120);
  }
  return null;
}

export function warmAi():Promise<void>{
  if(!endpoint)return Promise.resolve();
  if(warmPromise)return warmPromise;
  warmPromise=(async()=>{
    const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),3500);
    try{await fetch(`${endpoint}/health`,{credentials:'omit',cache:'no-store',signal:controller.signal})}
    catch{warmPromise=null}
    finally{window.clearTimeout(timeout)}
  })();
  return warmPromise;
}

export async function requestAiReply(input:{messages:DialogueMessage[];target:OrderTarget;criteria:Criteria;assessment:Assessment;beforeAssessment:Assessment;suggestedReply:AiReply;task:string;clerk?:'Lạc'|'Dận';difficulty?:'standard'|'rush'}):Promise<AiReply|null>{
  if(!endpoint)return null;
  try{
    const response=await post('/chat',{
      messages:input.messages.slice(-4).map(message=>({role:message.role,vi:message.vi})),
      target:input.target,
      criteria:input.criteria,
      assessment:input.assessment,
      beforeAssessment:input.beforeAssessment,
      suggestedReply:input.suggestedReply,
      task:input.task,
      clerk:input.clerk||'Lạc',
      difficulty:input.difficulty||'standard',
    // 对话不能因为移动网络抖动连续等待两轮；3.6 秒内未返回就立即使用本地已校验的推进语。
    },[3600]);
    if(!response?.ok)return null;
    const data=await response.json() as Partial<AiReply>;
    if(typeof data.vi!=='string'||typeof data.zh!=='string'||!data.vi.trim()||!data.zh.trim())return null;
    const attempts=Object.fromEntries((['product','quantity','sugar','service','payment']as const).filter(key=>data.attempts?.[key]==='correct'||data.attempts?.[key]==='incorrect').map(key=>[key,data.attempts?.[key]])) as Partial<Assessment>;
    const evidence=Object.fromEntries((['product','quantity','sugar','service','payment']as const).filter(key=>typeof data.evidence?.[key]==='string').map(key=>[key,String(data.evidence?.[key]).slice(0,120)])) as Partial<Record<keyof Assessment,string>>;
    const confidence=Object.fromEntries((['product','quantity','sugar','service','payment']as const).filter(key=>typeof data.confidence?.[key]==='number'&&Number.isFinite(data.confidence[key])).map(key=>[key,Math.max(0,Math.min(1,Number(data.confidence?.[key])))])) as Partial<Record<keyof Assessment,number>>;
    const mood=(['neutral','listening','happy','clarify'] as const).includes(data.mood as ClerkMood)?data.mood as ClerkMood:undefined;
    return{vi:data.vi.trim().slice(0,320),zh:data.zh.trim().slice(0,240),attempts,evidence,confidence,mood};
  }catch{return null}
}

export async function requestAiFeedback(input:{messages:DialogueMessage[];target:OrderTarget;assessment:Assessment;difficulty?:'standard'|'rush';responseTimes?:number[];timeouts?:number}):Promise<AiFeedback|null>{
  if(!endpoint)return null;
  try{
    // 评分只请求一次，避免手机端一次失败后再额外等待 6 秒。
    const response=await post('/report',{...input,messages:input.messages.filter(message=>message.role==='user').slice(-12)},[9000]);
    if(!response?.ok)return null;
    const data=await response.json() as Partial<AiFeedback>;
    if(typeof data.languageScore!=='number'||!Number.isFinite(data.languageScore)||typeof data.grammar!=='string'||typeof data.vocabulary!=='string'||typeof data.naturalness!=='string'||!Array.isArray(data.advice))return null;
    return{languageScore:Math.max(0,Math.min(25,Math.round(data.languageScore))),grammar:data.grammar.slice(0,240),vocabulary:data.vocabulary.slice(0,240),naturalness:data.naturalness.slice(0,240),advice:data.advice.filter((item):item is string=>typeof item==='string').slice(0,3).map(item=>item.slice(0,180))};
  }catch{return null}
}
