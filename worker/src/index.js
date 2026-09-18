const allowedOrigins=new Set(['https://nineoclock-huang.github.io','http://localhost:5173','http://127.0.0.1:5173']);
const buckets=new Map();
function cors(origin){return{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Content-Type':'application/json; charset=utf-8'}}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:cors(origin)})}
function rateLimited(request){const key=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),recent=(buckets.get(key)||[]).filter(time=>now-time<60000);recent.push(now);buckets.set(key,recent);return recent.length>24}
function validText(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max}
export default{
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get('Origin')||'';
    if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,model:'deepseek-flash'},200,allowedOrigins.has(origin)?origin:'https://nineoclock-huang.github.io');
    if(!allowedOrigins.has(origin))return json({error:'Origin not allowed'},403,'https://nineoclock-huang.github.io');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    if(request.method!=='POST'||url.pathname!=='/chat')return json({error:'Not found'},404,origin);
    if(rateLimited(request))return json({error:'Too many requests'},429,origin);
    if(!env.DEEPSEEK_API_KEY)return json({error:'AI is not configured'},503,origin);
    let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400,origin)}
    if(!Array.isArray(body.messages)||body.messages.length>10||!validText(body.task,160)||!body.suggestedReply||!validText(body.suggestedReply.vi,320)||!validText(body.suggestedReply.zh,240))return json({error:'Invalid request'},400,origin);
    const history=body.messages.filter(message=>(message.role==='user'||message.role==='clerk')&&validText(message.vi,320)).slice(-10).map(message=>({role:message.role==='user'?'user':'assistant',content:message.vi}));
    if(!history.length)return json({error:'Empty conversation'},400,origin);
    const completed=Object.entries(body.criteria||{}).filter(([,done])=>done).map(([name])=>name).join(', ')||'none';
    const prompt=`You are Lạc, a friendly young barista in a Hanoi cafe helping a beginner practise Vietnamese.\nCurrent task: ${body.task}.\nCompleted fields: ${completed}.\nThe deterministic game engine recommends this next conversational intent: Vietnamese: ${body.suggestedReply.vi} Chinese: ${body.suggestedReply.zh}.\nAcknowledge what the learner just said and preserve that intent. Never ask again for information already completed. If the learner only says cà phê, ask which coffee and offer concise options. Use natural A1-level Vietnamese, at most two short sentences, followed by an accurate Simplified Chinese translation. Do not score the learner or claim the order is complete unless the recommended intent does. Return only a json object exactly like {"vi":"...","zh":"..."}.`;
    let upstream;
    try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:prompt},...history],thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:240,temperature:.65,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
    if(!upstream.ok)return json({error:'AI request failed'},502,origin);
    try{const result=await upstream.json(),content=result.choices?.[0]?.message?.content,reply=JSON.parse(content);if(!validText(reply.vi,320)||!validText(reply.zh,240))throw new Error();return json({vi:reply.vi.trim(),zh:reply.zh.trim()},200,origin)}catch{return json({error:'Invalid AI response'},502,origin)}
  }
};
