const allowedOrigins=new Set(['https://nineoclock-huang.github.io','http://localhost:5173','http://127.0.0.1:5173']);
const buckets=new Map();
function cors(origin){return{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Content-Type':'application/json; charset=utf-8'}}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:cors(origin)})}
function rateLimited(request){const key=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),recent=(buckets.get(key)||[]).filter(time=>now-time<60000);recent.push(now);buckets.set(key,recent);return recent.length>24}
function validText(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max}
const criteriaKeys=['product','quantity','sugar','service','payment'];
function assessedAttempts(value){return Object.fromEntries(criteriaKeys.map(key=>[key,value?.[key]==='correct'||value?.[key]==='incorrect'?value[key]:'not_attempted']))}
export default{
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get('Origin')||'';
    if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,model:'deepseek-flash'},200,allowedOrigins.has(origin)?origin:'https://nineoclock-huang.github.io');
    if(!allowedOrigins.has(origin))return json({error:'Origin not allowed'},403,'https://nineoclock-huang.github.io');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    if(request.method!=='POST'||(url.pathname!=='/chat'&&url.pathname!=='/report'))return json({error:'Not found'},404,origin);
    if(rateLimited(request))return json({error:'Too many requests'},429,origin);
    if(!env.DEEPSEEK_API_KEY)return json({error:'AI is not configured'},503,origin);
    let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400,origin)}
    if(url.pathname==='/report'){
      if(!Array.isArray(body.messages)||body.messages.length>20||!body.target||!body.assessment||criteriaKeys.some(key=>!['correct','incorrect'].includes(body.assessment[key])))return json({error:'Invalid report request'},400,origin);
      const expressions=body.messages.filter(message=>message.role==='user'&&validText(message.vi,320)).slice(-12).map(message=>message.vi);
      if(!expressions.length)return json({error:'Empty report'},400,origin);
      const timing=body.difficulty==='rush'?` This was a timed challenge. The learner timed out ${Number(body.timeouts)||0} times; response times in milliseconds were ${JSON.stringify(Array.isArray(body.responseTimes)?body.responseTimes.slice(0,12):[])}. Mention one concrete speed/fluency suggestion, but do not alter the locked timeout penalties.`:'';
      const prompt=`You are a supportive Vietnamese A1 language tutor reviewing a Hanoi cafe role-play. Give a concise, concrete learning report in Simplified Chinese based ONLY on the learner's expressions. The task target is ${JSON.stringify(body.target)}. First-attempt task results are ${JSON.stringify(body.assessment)} and are LOCKED by the game; do not change, rescore, or dispute them.${timing} Assess only Vietnamese grammar, vocabulary appropriateness, and naturalness, from 0 to 25 total. Do not award high language points for unrelated or nonsensical text. Identify specific phrases to improve, explain why, and give up to three actionable practice suggestions with corrected Vietnamese examples. Never invent errors not present in the expressions. Return via submit_language_report.`;
      const reportTool={type:'function',function:{name:'submit_language_report',description:'Return a language-only score and specific learning advice.',parameters:{type:'object',properties:{languageScore:{type:'integer'},grammar:{type:'string'},vocabulary:{type:'string'},naturalness:{type:'string'},advice:{type:'array',items:{type:'string'}}},required:['languageScore','grammar','vocabulary','naturalness','advice'],additionalProperties:false}}};
      for(let attempt=0;attempt<2;attempt++){
        let upstream;try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:attempt?`${prompt}\nThe previous reply was invalid. Call submit_language_report with brief valid fields.`:prompt},{role:'user',content:JSON.stringify(expressions)}],thinking:{type:'disabled'},tools:[reportTool],tool_choice:{type:'function',function:{name:'submit_language_report'}},max_tokens:800,temperature:attempt?.1:.3,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
        if(!upstream.ok)return json({error:'AI request failed'},502,origin);
        try{const result=await upstream.json(),args=result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments,feedback=JSON.parse(args);if(!Number.isFinite(feedback.languageScore)||!validText(feedback.grammar,240)||!validText(feedback.vocabulary,240)||!validText(feedback.naturalness,240)||!Array.isArray(feedback.advice))throw new Error();return json({languageScore:Math.max(0,Math.min(25,Math.round(feedback.languageScore))),grammar:feedback.grammar,vocabulary:feedback.vocabulary,naturalness:feedback.naturalness,advice:feedback.advice.filter(value=>validText(value,180)).slice(0,3)},200,origin)}catch{if(attempt===1)return json({error:'Invalid AI report'},502,origin)}
      }
    }
    if(!Array.isArray(body.messages)||body.messages.length>10||!validText(body.task,160)||!body.target||!body.suggestedReply||!validText(body.suggestedReply.vi,320)||!validText(body.suggestedReply.zh,240))return json({error:'Invalid request'},400,origin);
    const history=body.messages.filter(message=>(message.role==='user'||message.role==='clerk')&&validText(message.vi,320)).slice(-4).map(message=>({role:message.role==='user'?'user':'assistant',content:message.vi}));
    if(!history.length)return json({error:'Empty conversation'},400,origin);
    const before=assessedAttempts(body.beforeAssessment),current=assessedAttempts(body.assessment),nextField=criteriaKeys.find(key=>current[key]==='not_attempted')||'complete';
    const clerk=body.clerk==='Dận'?'Dận':'Lạc',rush=body.difficulty==='rush';
    const personality=rush?'You are brisk, direct, visibly busy, and use short natural sentences. Guide the learner firmly without insulting them.':'You are friendly, patient, and encouraging.';
    const prompt=`You are ${clerk}, a Hanoi cafe barista speaking with a Vietnamese learner. ${personality} Never leave the cafe role, change your name, or mention AI/game rules. Target: ${body.task}; data=${JSON.stringify(body.target)}. State before the latest message=${JSON.stringify(before)}. State after local recognition=${JSON.stringify(current)}. Assess the latest message only for fields that were not_attempted BEFORE it; accept missing accents and natural word order, but generic "cà phê" is not an exact product. The next required field is ${nextField}. Acknowledge what was understood and, only if nextField is not complete, naturally guide toward that field. Never ask about a field already correct/incorrect in the current state. Guidance intent: ${body.suggestedReply.vi}. Avoid repeating your prior wording. Return ONLY compact JSON: {"vi":"...","zh":"...","mood":"happy|clarify|neutral","attempts":{"product":"correct|incorrect|not_attempted","quantity":"...","sugar":"...","service":"...","payment":"..."}}. Use happy when this answer advanced the order, clarify when unclear/wrong, neutral otherwise.`;
    let upstream;
    const focus=nextField==='complete'?'The order is complete. Do not ask another question.':`MANDATORY: the only next topic you may ask about is ${nextField}. Do not ask about ${criteriaKeys.filter(key=>key!==nextField).join(', ')}. Paraphrase this guidance naturally: ${body.suggestedReply.vi}`;
    try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},signal:request.signal,body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:prompt},...history,{role:'system',content:focus}],thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:140,temperature:.35,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
    if(!upstream.ok)return json({error:'AI request failed'},502,origin);
    try{const result=await upstream.json(),reply=JSON.parse(result.choices?.[0]?.message?.content);if(!validText(reply.vi,320)||!validText(reply.zh,240))throw new Error();const mood=['happy','clarify','neutral'].includes(reply.mood)?reply.mood:'neutral';return json({vi:reply.vi.trim(),zh:reply.zh.trim(),mood,attempts:assessedAttempts(reply.attempts)},200,origin)}catch{return json({error:'Invalid AI response'},502,origin)}
  }
};
