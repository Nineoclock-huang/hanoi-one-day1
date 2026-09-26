import {describe,it,expect} from 'vitest';
import {newMarket,marketTurn,buyMarket,balance,marketComplete,marketRoute,STALLS,readMarket,MARKET_KEY,marketOpening,marketScore,marketAdvice,nextScenario,MARKET_BUDGET} from './market';
describe('市场交易与行走',()=>{
 it('议价不突破底价，购买仅扣一次，预算不足不成交',()=>{
  let s=marketTurn(newMarket(),'fruit','Bot con 1 nghin duoc khong?').state;
  expect(s.quotes.fruit).toBeGreaterThanOrEqual(90000);
  s=marketTurn(s,'fruit','Bớt còn 95 nghìn được không?').state;
  expect(s.quotes.fruit).toBe(95000);s=buyMarket(s,'fruit');expect(balance(s)).toBe(145000);expect(buyMarket(s,'fruit')).toBe(s);
  s=marketTurn(s,'gifts','Bao nhieu tien?').state;s=buyMarket(s,'gifts');expect(marketComplete(s)).toBe(true);
  s=marketTurn(s,'cloth','Toi lay nhe').state;expect(buyMarket(s,'cloth')).toBe(s);expect(balance(s)).toBe(80000);
 });
 it('问价不自动购买；只闲聊也不能直接购买',()=>{const s=newMarket();expect(buyMarket(s,'fruit')).toBe(s);const chatting=marketTurn(s,'fruit','Chào cô').state;expect(buyMarket(chatting,'fruit')).toBe(chatting);expect(marketTurn(s,'fruit','Bao nhieu tien?').state.purchases).toEqual({});});
 it('情境线索、语言行为与本地报告有可核对的依据',()=>{
  let s=newMarket('unit');
  expect(marketOpening(s,'fruit').vi).toContain('một cân');
  expect(marketOpening(s,'gifts').vi).toContain('Chào');
  const turn=marketTurn(s,'fruit','Cô ơi, xoài bao nhiêu tiền một cân ạ?');
  s=turn.state;expect(turn.event).toBe('price-unit');expect(s.skills.askedPrice).toContain('fruit');
  s=marketTurn(s,'fruit','Hai cân, tổng cộng bao nhiêu tiền ạ?').state;
  expect(s.skills.scenarioSolved).toBe(true);expect(s.skills.confirmed).toContain('fruit');
  expect(marketScore(s).comprehension).toBe(10);
  expect(marketAdvice(s).some(item=>item.includes('两公斤'))).toBe(false);
  expect(MARKET_BUDGET).toBe(240000);
  expect(nextScenario('unit')).not.toBe('unit');
 });
 it('旧版存档可以迁移，保留购物和报价',()=>{
  const old={version:1,quotes:{fruit:95000,gifts:65000,cloth:80000},purchases:{fruit:95000},history:{fruit:[{role:'user',vi:'Bao nhieu tien?'}],gifts:[],cloth:[]},visited:['fruit'],bargains:['fruit']};
  localStorage.setItem(MARKET_KEY,JSON.stringify(old));
  expect(readMarket()).toMatchObject({version:2,scenario:'unit',purchases:{fruit:95000},quotes:{fruit:95000},skills:{askedPrice:['fruit']}});
  localStorage.removeItem(MARKET_KEY);
 });
 it('无意义输入不能靠重复刷出语言分或直接购买',()=>{
  let s=newMarket();
  for(let i=0;i<5;i++)s=marketTurn(s,'fruit','xyz xyz').state;
  expect(marketScore(s).expression).toBe(0);
  expect(buyMarket(s,'fruit')).toBe(s);
  s=marketTurn(s,'fruit','Xin lỗi, ý tôi là xoài.').state;
  expect(s.skills.repairs).toBe(1);
 });
 it('同一句同时问价和说明送礼，摊主会同时回答两个问题',()=>{
  const turn=marketTurn(newMarket('wrap'),'gifts','Một hộp bánh đậu xanh bao nhiêu tiền? Tôi mua để tặng bạn.');
  expect(turn.event).toBe('price-wrap');
  expect(turn.reply.vi).toContain('65 nghìn');
  expect(turn.reply.vi).toContain('gói quà');
  expect(turn.state.skills.scenarioSolved).toBe(true);
  expect(marketTurn(newMarket('fabric'),'cloth','Xanh ạ').state.skills.scenarioSolved).toBe(true);
  expect(marketTurn(newMarket('fabric'),'cloth','Xanh ạ').reply.vi).toContain('màu xanh đây');
  expect(marketTurn(newMarket('wrap'),'gifts','Không cần gói quà ạ.').reply.vi).toContain('không gói');
  const tooLow=marketTurn(newMarket(),'fruit','Bớt còn 1 nghìn được không?');
  expect(tooLow.state.quotes.fruit).toBe(110000);
  expect(tooLow.state.bargains).toEqual([]);
 });
 it('各摊位之间的每段路线避开所有摊位实体',()=>{
  for(const from of STALLS)for(const to of STALLS){const route=marketRoute({x:from.x,z:from.z<0?from.z+2.3:from.z-2.3},to.id);for(let i=1;i<route.length;i++)for(let f=0;f<=1;f+=.05){const x=route[i-1].x+(route[i].x-route[i-1].x)*f,z=route[i-1].z+(route[i].z-route[i-1].z)*f;expect(STALLS.some(t=>Math.abs(t.x-x)<2.2&&Math.abs(t.z-z)<1.4)).toBe(false);}}
 });
 it('两个市场入口到每个摊位的跳跃路线也不会穿过摊位',()=>{
  for(const startX of [-7,7])for(const to of STALLS){
   const route=marketRoute({x:startX,z:0},to.id);
   expect(route.at(-1)).toEqual({x:to.x,z:to.z<0?to.z+2.3:to.z-2.3});
   for(let i=1;i<route.length;i++)for(let f=0;f<=1;f+=.05){
    const x=route[i-1].x+(route[i].x-route[i-1].x)*f;
    const z=route[i-1].z+(route[i].z-route[i-1].z)*f;
    expect(STALLS.some(t=>Math.abs(t.x-x)<2.2&&Math.abs(t.z-z)<1.4)).toBe(false);
   }
  }
 });
 it('损坏的存档恢复为新一轮',()=>{localStorage.setItem(MARKET_KEY,'{"version":1}');expect(readMarket()).toEqual(newMarket());localStorage.removeItem(MARKET_KEY);});
});
