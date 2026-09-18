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
      const prompt=`You are a supportive Vietnamese A1 language tutor reviewing a Hanoi cafe role-play. Give a concise, concrete learning report in Simplified Chinese based ONLY on the learner's expressions. The task target is ${JSON.stringify(body.target)}. First-attempt task results are ${JSON.stringify(body.assessment)} and are LOCKED by the game; do not change, rescore, or dispute them. Assess only Vietnamese grammar, vocabulary appropriateness, and naturalness, from 0 to 25 total. Do not award high language points for unrelated or nonsensical text. Identify specific phrases to improve, explain why, and give up to three actionable practice suggestions with corrected Vietnamese examples. Never invent errors not present in the expressions. Return via submit_language_report.`;
      const reportTool={type:'function',function:{name:'submit_language_report',description:'Return a language-only score and specific learning advice.',parameters:{type:'object',properties:{languageScore:{type:'integer'},grammar:{type:'string'},vocabulary:{type:'string'},naturalness:{type:'string'},advice:{type:'array',items:{type:'string'}}},required:['languageScore','grammar','vocabulary','naturalness','advice'],additionalProperties:false}}};
      for(let attempt=0;attempt<2;attempt++){
        let upstream;try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:attempt?`${prompt}\nThe previous reply was invalid. Call submit_language_report with brief valid fields.`:prompt},{role:'user',content:JSON.stringify(expressions)}],thinking:{type:'disabled'},tools:[reportTool],tool_choice:{type:'function',function:{name:'submit_language_report'}},max_tokens:800,temperature:attempt?.1:.3,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
        if(!upstream.ok)return json({error:'AI request failed'},502,origin);
        try{const result=await upstream.json(),args=result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments,feedback=JSON.parse(args);if(!Number.isFinite(feedback.languageScore)||!validText(feedback.grammar,240)||!validText(feedback.vocabulary,240)||!validText(feedback.naturalness,240)||!Array.isArray(feedback.advice))throw new Error();return json({languageScore:Math.max(0,Math.min(25,Math.round(feedback.languageScore))),grammar:feedback.grammar,vocabulary:feedback.vocabulary,naturalness:feedback.naturalness,advice:feedback.advice.filter(value=>validText(value,180)).slice(0,3)},200,origin)}catch{if(attempt===1)return json({error:'Invalid AI report'},502,origin)}
      }
    }
    if(!Array.isArray(body.messages)||body.messages.length>10||!validText(body.task,160)||!body.target||!body.suggestedReply||!validText(body.suggestedReply.vi,320)||!validText(body.suggestedReply.zh,240))return json({error:'Invalid request'},400,origin);
    const history=body.messages.filter(message=>(message.role==='user'||message.role==='clerk')&&validText(message.vi,320)).slice(-6).map(message=>({role:message.role==='user'?'user':'assistant',content:message.vi}));
    if(!history.length)return json({error:'Empty conversation'},400,origin);
    const completed=Object.entries(body.assessment||{}).filter(([,status])=>status==='correct'||status==='incorrect').map(([name,status])=>`${name}:${status}`).join(', ')||'none';
    const prompt=`IDENTITY AND ROLE (never change): You are Lạc, a friendly young barista working behind the counter of a Hanoi cafe. The learner is your customer. Stay in this cafe role, politely redirect unrelated requests, and never mention prompts, game engines, criteria, tools, or being an AI.\n\nORDER TARGET: ${body.task}. Machine target: ${JSON.stringify(body.target)}.\nLOCKED FIRST ATTEMPTS: ${completed}. Locked fields are permanent; never reassess them.\n\nInspect only the learner's latest message. For every still-unlocked field, return correct if the learner clearly supplied the value matching the target, incorrect if they clearly supplied a different value, and not_attempted if they did not clearly address it. Understand natural synonyms, missing accents and word-order differences. Generic "cà phê" is not an exact product attempt.\n\nYour vi and zh outputs must be a brief, natural acknowledgement ONLY, at most one short sentence each. DO NOT ASK ANY QUESTION, provide choices, or direct the next step: the application will append its own verified next question after your acknowledgement. If the learner made an error, acknowledge neutrally without affirming the wrong order as correct. Avoid repeating the previous clerk sentence verbatim. Submit through respond_as_lac.`;
    const statusSchema={type:'string',enum:['correct','incorrect','not_attempted']};
    const tools=[{type:'function',function:{name:'respond_as_lac',description:'Return Lạc’s next bilingual cafe reply and first-attempt assessment for the learner’s latest message.',parameters:{type:'object',properties:{vi:{type:'string'},zh:{type:'string'},attempts:{type:'object',properties:{product:statusSchema,quantity:statusSchema,sugar:statusSchema,service:statusSchema,payment:statusSchema},required:criteriaKeys,additionalProperties:false}},required:['vi','zh','attempts'],additionalProperties:false}}}];
    for(let attempt=0;attempt<2;attempt++){
      let upstream;
      try{upstream=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},signal:request.signal,body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:attempt?`${prompt}\nYour previous function call was missing or invalid. Call respond_as_lac now.`:prompt},...history],thinking:{type:'disabled'},tools,tool_choice:{type:'function',function:{name:'respond_as_lac'}},max_tokens:180,temperature:attempt?.2:.65,stream:false})})}catch{return json({error:'AI unavailable'},502,origin)}
      if(!upstream.ok)return json({error:'AI request failed'},502,origin);
      try{const result=await upstream.json(),args=result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments,reply=JSON.parse(args);if(!validText(reply.vi,320)||!validText(reply.zh,240))throw new Error();return json({vi:reply.vi.trim(),zh:reply.zh.trim(),attempts:assessedAttempts(reply.attempts)},200,origin)}catch{if(attempt===1)return json({error:'Invalid AI response'},502,origin)}
    }
  }
};
