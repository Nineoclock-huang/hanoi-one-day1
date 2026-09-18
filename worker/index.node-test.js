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
  globalThis.fetch=async(_url,options)=>{authorization=options.headers.Authorization;upstreamBody=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{tool_calls:[{function:{arguments:JSON.stringify({vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？',recognized:{quantity:true}})}}]}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  try{
    const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',vi:'Cà phê'}],task:'一杯少糖冰牛奶咖啡，带走',target:{product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'},criteria:{product:false,quantity:false,sugar:false,service:false,payment:false},suggestedReply:{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'}})}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？',recognized:{product:false,quantity:true,sugar:false,service:false,payment:false}});
    assert.equal(authorization,'Bearer test-secret');
    assert.deepEqual(upstreamBody.thinking,{type:'disabled'});
    assert.equal(upstreamBody.tool_choice.function.name,'respond_as_lac');
  }finally{globalThis.fetch=originalFetch}
});

test('Worker retries once when DeepSeek returns empty JSON content',async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{tool_calls:calls===1?[]:[{function:{arguments:JSON.stringify({vi:'Bạn muốn dùng loại nào?',zh:'你想选择哪一种？',recognized:{}})}}]}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  try{
    const payload={messages:[{role:'user',vi:'Cà phê'}],task:'一杯少糖冰牛奶咖啡，带走',target:{product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'},criteria:{product:false,quantity:false,sugar:false,service:false,payment:false},suggestedReply:{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'}};
    const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify(payload)}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,200);
    assert.equal(calls,2);
  }finally{globalThis.fetch=originalFetch}
});
