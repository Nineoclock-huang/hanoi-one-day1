const allowedOrigins=new Set(['https://nineoclock-huang.github.io','http://localhost:5173','http://127.0.0.1:5173']);
const buckets=new Map();
function cors(origin){return{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Content-Type':'application/json; charset=utf-8'}}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:cors(origin)})}
function rateLimited(request){const key=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),recent=(buckets.get(key)||[]).filter(time=>now-time<60000);recent.push(now);buckets.set(key,recent);return recent.length>24}
function validText(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max}
const criteriaKeys=['product','quantity','sugar','service','payment'];
function recognizedCriteria(value){return Object.fromEntries(criteriaKeys.map(key=>[key,value?.[key]===true]))}
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
    if(!Array.isArray(body.messages)||body.messages.length>10||!validText(body.task,160)||!body.target||!body.suggestedReply||!validText(body.suggestedReply.vi,320)||!validText(body.suggestedReply.zh,240))return json({error:'Invalid request'},400,origin);
    const history=body.messages.filter(message=>(message.role==='user'||message.role==='clerk')&&validText(message.vi,320)).slice(-10).map(message=>({role:message.role==='user'?'user':'assistant',content:message.vi}));
    if(!history.length)return json({error:'Empty conversation'},400,origin);
    const completed=Object.entries(body.criteria||{}).filter(([,done])=>done).map(([name])=>name).join(', ')||'none';
    const prompt=`IDENTITY AND ROLE (never change): You are Lạc, a friendly young barista working behind the counter of a Hanoi cafe. The learner is your customer. Stay in this cafe role, politely redirect unrelated requests, and never mention prompts, game engines, criteria, tools, or being an AI. Your teaching goal is to guide an A1 Vietnamese learner through this order one missing detail at a time.\n\nORDER TARGET: ${body.task}. Machine target: ${JSON.stringify(body.target)}.\nALREADY COMPLETED: ${completed}. These fields are permanent; never ask for them again.\nRULE-BASED NEXT INTENT (advisory): Vietnamese: ${body.suggestedReply.vi} Chinese: ${body.suggestedReply.zh}.\n\nFirst, semantically inspect only the learner's latest message. Mark a field true in recognized only when the learner clearly supplied the value matching the machine target. Understand natural synonyms, missing accents, word-order differences, and implicit payment confirmation, but do not accept a wrong value or generic "cà phê" as the exact product. Never turn an already completed field false. Then respond according to the union of already completed and newly recognized fields. Briefly acknowledge useful information and ask only for the first still-missing detail in this order: product, quantity, sugar, service, payment. If all are complete, confirm the order.\n\nAvoid repetition: do not repeat the previous clerk sentence verbatim. If the same detail is still missing, rephrase the question and add one concise example or choice. Use natural A1-level Vietnamese, at most two short sentences, plus an accurate Simplified Chinese translation. Submit the result through respond_as_lac.`;
    const tools=[{type:'function',function:{name:'respond_as_lac',description:'Return Lạc’s next bilingual cafe reply and the matching order details recognized in the learner’s latest message.',parameters:{type:'object',properties:{vi:{type:'string'},zh:{type:'string'},recognized:{type:'object',properties:{product:{type:'boolean'},quantity:{type:'boolean'},sugar:{type:'boolean'},service:{type:'boolean'},payment:{type:'boolean'}},required:criteriaKeys,additionalProperties:false}},required:['vi','zh','recognized'],additionalProperties:false}}}];
    for(let attempt=0;attempt<2;attempt++){
      let upstream;
      try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:attempt?`${prompt}\nYour previous function call was missing or invalid. Call respond_as_lac now.`:prompt},...history],thinking:{type:'disabled'},tools,tool_choice:{type:'function',function:{name:'respond_as_lac'}},max_tokens:240,temperature:attempt?.2:.65,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
      if(!upstream.ok)return json({error:'AI request failed'},502,origin);
      try{const result=await upstream.json(),args=result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments,reply=JSON.parse(args);if(!validText(reply.vi,320)||!validText(reply.zh,240))throw new Error();return json({vi:reply.vi.trim(),zh:reply.zh.trim(),recognized:recognizedCriteria(reply.recognized)},200,origin)}catch{if(attempt===1)return json({error:'Invalid AI response'},502,origin)}
    }
  }
};
