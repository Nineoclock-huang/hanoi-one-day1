import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/index.js';

test('Worker rejects unknown websites before contacting DeepSeek',async()=>{
  const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://evil.example'}}),{DEEPSEEK_API_KEY:'secret'});
  assert.equal(response.status,403);
});

test('Worker returns a validated bilingual reply without exposing the key',async()=>{
  const originalFetch=globalThis.fetch;
  let authorization='';
  let upstreamBody;
  globalThis.fetch=async(_url,options)=>{authorization=options.headers.Authorization;upstreamBody=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？',mood:'clarify',attempts:{quantity:'correct'}})}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  try{
    const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',vi:'Cà phê'}],task:'一杯少糖冰牛奶咖啡，带走',target:{product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'},criteria:{product:true,quantity:true,sugar:true,service:true,payment:false},beforeAssessment:{},assessment:{product:'correct',quantity:'correct',sugar:'correct',service:'correct',payment:'not_attempted'},suggestedReply:{vi:'Bạn muốn thanh toán bằng cách nào?',zh:'你想如何付款？'}})}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？',mood:'clarify',attempts:{product:'not_attempted',quantity:'correct',sugar:'not_attempted',service:'not_attempted',payment:'not_attempted'}});
    assert.equal(authorization,'Bearer test-secret');
    assert.deepEqual(upstreamBody.thinking,{type:'disabled'});
    assert.deepEqual(upstreamBody.response_format,{type:'json_object'});
    assert.equal(upstreamBody.max_tokens,140);
    assert.match(upstreamBody.messages[0].content,/next required field is payment/);
    assert.match(upstreamBody.messages[0].content,/Never ask about a field already correct/);
    assert.match(upstreamBody.messages.at(-1).content,/only next topic.*payment/);
  }finally{globalThis.fetch=originalFetch}
});

test('Worker fails fast instead of doubling latency on an invalid AI response',async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:''}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  try{
    const payload={messages:[{role:'user',vi:'Cà phê'}],task:'一杯少糖冰牛奶咖啡，带走',target:{product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'},criteria:{product:false,quantity:false,sugar:false,service:false,payment:false},suggestedReply:{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'}};
    const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify(payload)}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,502);
    assert.equal(calls,1);
  }finally{globalThis.fetch=originalFetch}
});

test('Worker returns language-only feedback without changing locked task marks',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{tool_calls:[{function:{arguments:JSON.stringify({languageScore:18,grammar:'句子结构基本正确',vocabulary:'咖啡词汇需更准确',naturalness:'语气自然',advice:['练习 cà phê sữa đá']})}}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  try{
    const assessment={product:'incorrect',quantity:'correct',sugar:'correct',service:'correct',payment:'correct'};
    const response=await worker.fetch(new Request('https://worker.example/report',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',vi:'Cho tôi cà phê đen đá'}],target:{product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'},assessment})}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,200);
    const report=await response.json();
    assert.equal(report.languageScore,18);
    assert.equal('assessment' in report,false);
  }finally{globalThis.fetch=originalFetch}
});
