import {normalizeVietnamese,type Assessment,type Criteria,type OrderTarget} from './engine';
import {selectAiEndpoint,TENCENT_AI_ENDPOINT} from './aiEndpoint';

export type DialogueMessage={role:'clerk'|'user';vi:string;zh?:string};
export type ClerkMood='neutral'|'listening'|'happy'|'clarify';
export type AiReply={vi:string;zh:string;attempts?:Partial<Assessment>;evidence?:Partial<Record<keyof Assessment,string>>;confidence?:Partial<Record<keyof Assessment,number>>;mood?:ClerkMood};
export type AiFeedback={languageScore:number;grammar:string;vocabulary:string;naturalness:string;advice:string[]};
export type AiFeedbackFailure='timeout'|'network'|'blocked'|'rate-limited'|'server'|'invalid'|'unconfigured';
export type AiFeedbackResult={feedback:AiFeedback|null;failure?:AiFeedbackFailure};
const endpoint=selectAiEndpoint(import.meta.env.MODE,import.meta.env.VITE_AI_ENDPOINT as string|undefined,typeof navigator==='undefined'?'':navigator.userAgent);
const usesMobileBridge=endpoint===TENCENT_AI_ENDPOINT;
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

export function fallbackLanguageFeedback(messages:DialogueMessage[],assessment:Assessment):AiFeedback{
  const expressions=messages.filter(message=>message.role==='user').map(message=>message.vi.trim()).filter(Boolean);
  const normalized=normalizeVietnamese(expressions.join(' '));
  const signals=['toi','cho','ca phe','ly','coc','duong','ngot','mang di','tai cho','thanh toan','tra tien'];
  const signalCount=signals.filter(signal=>normalized.includes(signal)).length;
  const resolvedCorrect=Object.values(assessment).filter(value=>value==='correct').length;
  const languageScore=Math.max(2,Math.min(17,4+signalCount+resolvedCorrect));
  const hasAccents=expressions.some(text=>normalizeVietnamese(text)!==text.toLowerCase().replace(/\s+/g,' ').trim());
  return{
    languageScore,
    grammar:expressions.length?'能够用短句推进点单；建议把商品、数量和要求组合成一个完整句子。':'本次没有足够的越南语表达可供分析。',
    vocabulary:signalCount>=4?'已经使用了多项咖啡店点单词汇，但仍要核对商品和服务方式是否准确。':'咖啡店核心词汇还不够完整，优先练习商品、数量、糖量与付款表达。',
    naturalness:hasAccents?'表达基本可理解；加入礼貌词“cho tôi”和“cảm ơn”会更自然。':'系统能够理解无声调输入；正式书写时补全声调会更自然、更准确。',
    advice:['练习把信息合并成一句：Cho tôi một ly cà phê sữa đá, ít đường, mang đi.','付款时可以说：Tôi thanh toán bằng tiền mặt.'],
  };
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
    // 手机直连腾讯云多等一次冷启动；桌面仍保持原有 3.6 秒上限。超时后使用本地推进语。
    },[usesMobileBridge?7000:3600]);
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

export async function requestAiFeedback(input:{messages:DialogueMessage[];target:OrderTarget;assessment:Assessment;difficulty?:'standard'|'rush';responseTimes?:number[];timeouts?:number},reportEndpoint=endpoint):Promise<AiFeedbackResult>{
  if(!reportEndpoint)return{feedback:null,failure:'unconfigured'};
  const payload=JSON.stringify({...input,messages:input.messages.filter(message=>message.role==='user').slice(-12),sessionId:sessionId()});
  const attempt=async(limitMs:number):Promise<AiFeedbackResult>=>{
    const controller=new AbortController();let timer=0;
    const request=(async():Promise<AiFeedbackResult>=>{
      try{
        // 评分页不会离开页面，避免在微信 WebView 中使用受配额限制的 keepalive 请求。
        const response=await fetch(`${reportEndpoint}/report`,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},credentials:'omit',cache:'no-store',signal:controller.signal,body:payload});
        if(!response.ok)return{feedback:null,failure:response.status===403?'blocked':response.status===429?'rate-limited':response.status>=500?'server':'invalid'};
        const data=await response.json() as Partial<AiFeedback>;
        const languageScore=Number(data.languageScore);
        if(!Number.isFinite(languageScore)||typeof data.grammar!=='string'||typeof data.vocabulary!=='string'||typeof data.naturalness!=='string'||!Array.isArray(data.advice))return{feedback:null,failure:'invalid'};
        return{feedback:{languageScore:Math.max(0,Math.min(25,Math.round(languageScore))),grammar:data.grammar.trim().slice(0,240),vocabulary:data.vocabulary.trim().slice(0,240),naturalness:data.naturalness.trim().slice(0,240),advice:data.advice.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).slice(0,3).map(item=>item.trim().slice(0,180))}};
      }catch{return{feedback:null,failure:'network'}}
    })();
    const timeout=new Promise<AiFeedbackResult>(resolve=>{timer=window.setTimeout(()=>{controller.abort();resolve({feedback:null,failure:'timeout'})},limitMs)});
    try{return await Promise.race([request,timeout])}finally{window.clearTimeout(timer)}
  };
  let result=await attempt(usesMobileBridge?19_000:8000);
  if(!usesMobileBridge&&!result.feedback&&['timeout','network','server','invalid'].includes(result.failure||'')){
    await pause(150);
    result=await attempt(6000);
  }
  if(!result.feedback)console.warn('[AI report] unavailable:',result.failure);
  return result;
}

export async function requestMarketReply(input:{stall:string;messages:DialogueMessage[];price:number;event:string;suggestedReply:DialogueMessage}):Promise<{vi:string;zh:string}|null>{
  if(!endpoint)return null;
  try{const response=await post('/market',input,[usesMobileBridge?8000:6500]);if(!response?.ok)return null;const data=await response.json();return typeof data.vi==='string'&&data.vi.trim()&&typeof data.zh==='string'&&data.zh.trim()?{vi:data.vi.slice(0,320),zh:data.zh.slice(0,240)}:null;}catch{return null;}
}
