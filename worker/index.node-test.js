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
  globalThis.fetch=async(_url,options)=>{authorization=options.headers.Authorization;upstreamBody=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'})}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  try{
    const response=await worker.fetch(new Request('https://worker.example/chat',{method:'POST',headers:{Origin:'https://nineoclock-huang.github.io','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',vi:'Cà phê'}],task:'一杯少糖冰牛奶咖啡，带走',criteria:{product:false,quantity:false,sugar:false,service:false,payment:false},suggestedReply:{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'}})}),{DEEPSEEK_API_KEY:'test-secret'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{vi:'Bạn muốn loại cà phê nào?',zh:'你想要哪一种咖啡？'});
    assert.equal(authorization,'Bearer test-secret');
    assert.deepEqual(upstreamBody.thinking,{type:'disabled'});
  }finally{globalThis.fetch=originalFetch}
});
