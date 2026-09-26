import { normalizeVietnamese } from './engine';
export const STALLS = [
  {id:'fruit',name:'兰姨水果摊',vi:'TRÁI CÂY',vendor:'Cô Lan',personality:'热情，愿意给爽快的客人优惠',item:'两公斤芒果',itemVi:'hai cân xoài',icon:'🥭',color:'#cd7141',x:-5,z:-3,price:110000,floor:90000},
  {id:'gifts',name:'安的特产铺',vi:'QUÀ HÀ NỘI',vendor:'An',personality:'耐心，擅长推荐伴手礼',item:'一盒绿豆糕',itemVi:'một hộp bánh đậu xanh',icon:'🎁',color:'#538571',x:5,z:-3,price:65000,floor:50000},
  {id:'cloth',name:'明的织物铺',vi:'VẢI & KHĂN',vendor:'Minh',personality:'精明，喜欢有理由的议价',item:'一条围巾（可选）',itemVi:'một chiếc khăn',icon:'🧣',color:'#537e9b',x:0,z:4,price:80000,floor:65000},
] as const;
export type StallId=typeof STALLS[number]['id'];
export type MarketLine={role:'user'|'clerk';vi:string;zh?:string;source?:'ai'|'local'};
export type MarketSave={version:1;quotes:Record<StallId,number>;purchases:Partial<Record<StallId,number>>;history:Record<StallId,MarketLine[]>;visited:StallId[];bargains:StallId[]};
export const MARKET_KEY='hanoi-market-v1';
export const money=(n:number)=>`${n.toLocaleString('vi-VN')}₫`;
export const newMarket=():MarketSave=>({version:1,quotes:{fruit:110000,gifts:65000,cloth:80000},purchases:{},history:{fruit:[],gifts:[],cloth:[]},visited:[],bargains:[]});
export function readMarket():MarketSave{
  try{const s=JSON.parse(localStorage.getItem(MARKET_KEY)||'null') as MarketSave;
    if(s?.version===1&&s.purchases&&Array.isArray(s.visited)&&Array.isArray(s.bargains)&&STALLS.every(t=>Number.isFinite(s.quotes?.[t.id])&&s.quotes[t.id]>=t.floor&&s.quotes[t.id]<=t.price&&Array.isArray(s.history?.[t.id])&&s.history[t.id].every(m=>m&&(m.role==='user'||m.role==='clerk')&&typeof m.vi==='string'&&(m.zh===undefined||typeof m.zh==='string'))&&(s.purchases[t.id]===undefined||(Number.isFinite(s.purchases[t.id])&&s.purchases[t.id]! >=t.floor&&s.purchases[t.id]! <=t.price)))&&balance(s)>=0)return s;
  }catch{}return newMarket();
}
export const balance=(s:MarketSave)=>200000-Object.values(s.purchases).reduce((a,b)=>a+(b||0),0);
export const marketComplete=(s:MarketSave)=>s.purchases.fruit!==undefined&&s.purchases.gifts!==undefined&&s.bargains.some(id=>s.purchases[id]!==undefined);
export function marketTurn(s:MarketSave,id:StallId,input:string):{state:MarketSave;reply:MarketLine;event:string}{
  const t=STALLS.find(t=>t.id===id)!,text=normalizeVietnamese(input),old=s.quotes[id];
  let price=old,event='question',vi=`Bạn muốn biết gì về ${t.itemVi}?`,zh=`你想了解${t.item}的什么信息？`;
  if(/bao nhieu|gia|tien/.test(text)){vi=`${t.itemVi} giá ${old/1000} nghìn đồng.`;zh=`${t.item}共 ${money(old)}。`;event='price';}
  if(/bot|giam|dat qua|re hon|mac qua/.test(text)){
    const raw=text.match(/\b(\d{2,6})(?:\s*(?:nghin|ngan|k))?\b/),offer=raw?Number(raw[1])*(Number(raw[1])<1000?1000:1):old-5000;
    price=Math.max(t.floor,Math.min(old,offer));event='bargain';
    vi=price<old?`Được, ${price/1000} nghìn cho ${t.itemVi} nhé.`:`${old/1000} nghìn là giá tốt nhất rồi bạn ạ.`;
    zh=price<old?`可以，${t.item}给你 ${money(price)}。`:`${money(old)} 已经是最低价啦。`;
  }else if(/tuoi|ngon|chat luong|qua|tang/.test(text)){vi=`${t.itemVi} rất hợp đấy. Bạn muốn xem không?`;zh=`${t.item}很合适，要看一下吗？`;}
  else if(/mua|lay|dong y|thanh toan/.test(text)){vi=`Tổng cộng ${old/1000} nghìn đồng. Bạn xác nhận nhé?`;zh=`总共 ${money(old)}，请确认购买。`;event='confirm';}
  if(s.purchases[id]!==undefined){price=old;event='purchased';vi='Cảm ơn bạn! Hẹn gặp lại.';zh='谢谢你，下次见！';}
  const reply:MarketLine={role:'clerk',vi,zh,source:'local'};
  return{state:{...s,quotes:{...s.quotes,[id]:price},bargains:price<old?[...new Set([...s.bargains,id])]:s.bargains,history:{...s.history,[id]:[...s.history[id],{role:'user',vi:input},reply].slice(-30)}},reply,event};
}
export function buyMarket(s:MarketSave,id:StallId):MarketSave{
  if(s.purchases[id]!==undefined||s.quotes[id]>balance(s)||!s.history[id].some(m=>m.role==='user'))return s;
  return{...s,purchases:{...s.purchases,[id]:s.quotes[id]}};
}
// Every journey stays on the broad central aisle; stall fronts are outside their footprints.
export function marketRoute(start:{x:number;z:number},id:StallId){
  const t=STALLS.find(t=>t.id===id)!,end={x:t.x,z:t.z<0?t.z+2.3:t.z-2.3};
  return[start,{x:start.x,z:0},{x:end.x,z:0},end].filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.01);
}
