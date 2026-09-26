import {describe,it,expect} from 'vitest';
import {newMarket,marketTurn,buyMarket,balance,marketComplete,marketRoute,STALLS,readMarket,MARKET_KEY} from './market';
describe('市场交易与行走',()=>{
 it('议价不突破底价，购买仅扣一次，预算不足不成交',()=>{
  let s=marketTurn(newMarket(),'fruit','Bot con 1 nghin duoc khong?').state;
  expect(s.quotes.fruit).toBeGreaterThanOrEqual(90000);
  s=marketTurn(s,'fruit','Bớt còn 95 nghìn được không?').state;
  expect(s.quotes.fruit).toBe(95000);s=buyMarket(s,'fruit');expect(balance(s)).toBe(105000);expect(buyMarket(s,'fruit')).toBe(s);
  s=marketTurn(s,'gifts','Bao nhieu tien?').state;s=buyMarket(s,'gifts');expect(marketComplete(s)).toBe(true);
  s=marketTurn(s,'cloth','Toi lay nhe').state;expect(buyMarket(s,'cloth')).toBe(s);expect(balance(s)).toBe(40000);
 });
 it('问价不自动购买；没有交流不能点击购买',()=>{const s=newMarket();expect(buyMarket(s,'fruit')).toBe(s);expect(marketTurn(s,'fruit','Bao nhieu tien?').state.purchases).toEqual({});});
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
