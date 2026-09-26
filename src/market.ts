import { normalizeVietnamese } from './engine';
export const STALLS = [
  {id:'fruit',name:'兰姨水果摊',vi:'TRÁI CÂY',vendor:'Cô Lan',personality:'热情，愿意给爽快的客人优惠',item:'两公斤芒果',itemVi:'hai cân xoài',icon:'🥭',color:'#cd7141',x:-5,z:-3,price:110000,floor:90000},
  {id:'gifts',name:'安的特产铺',vi:'QUÀ HÀ NỘI',vendor:'An',personality:'耐心，擅长推荐伴手礼',item:'一盒绿豆糕',itemVi:'một hộp bánh đậu xanh',icon:'🎁',color:'#538571',x:5,z:-3,price:65000,floor:50000},
  {id:'cloth',name:'明的织物铺',vi:'VẢI & KHĂN',vendor:'Minh',personality:'精明，喜欢有理由的议价',item:'一条围巾（可选）',itemVi:'một chiếc khăn',icon:'🧣',color:'#537e9b',x:0,z:4,price:80000,floor:65000},
] as const;
export type StallId=typeof STALLS[number]['id'];
export type MarketLine={role:'user'|'clerk';vi:string;zh?:string;source?:'ai'|'local'};
export const MARKET_BUDGET=240000;
export const MARKET_SCENARIOS=[
  {id:'unit',stall:'fruit',label:'单位谜题',clue:'水果按“每公斤”报价，记得核对两公斤的总价。',vi:'Xoài 55 nghìn một cân. Bạn muốn lấy mấy cân?',zh:'芒果每公斤五万五，你要几公斤？'},
  {id:'wrap',stall:'gifts',label:'礼盒小选择',clue:'伴手礼能免费包装。试着说明是送人的，或明确说不需要。',vi:'Bạn mua để tặng ai à? Tôi có thể gói quà miễn phí.',zh:'你是买来送人的吗？我可以免费包装。'},
  {id:'fabric',stall:'cloth',label:'颜色线索',clue:'织物摊有不同颜色。问问颜色，或说出你的偏好。',vi:'Bạn thích khăn màu gì? Có màu xanh và màu đỏ.',zh:'你喜欢什么颜色的围巾？有蓝色和红色。'},
] as const;
export type MarketScenarioId=typeof MARKET_SCENARIOS[number]['id'];
export type MarketSkills={askedPrice:StallId[];confirmed:StallId[];repairs:number;polite:number;hints:number;scenarioSolved:boolean};
export type MarketSave={version:2;scenario:MarketScenarioId;quotes:Record<StallId,number>;purchases:Partial<Record<StallId,number>>;history:Record<StallId,MarketLine[]>;visited:StallId[];bargains:StallId[];skills:MarketSkills};
export const MARKET_KEY='hanoi-market-v1';
export const money=(n:number)=>`${n.toLocaleString('vi-VN')}₫`;
export const scenarioFor=(s:MarketSave)=>MARKET_SCENARIOS.find(item=>item.id===s.scenario)!;
export const nextScenario=(current:MarketScenarioId):MarketScenarioId=>{
  const choices=MARKET_SCENARIOS.filter(item=>item.id!==current);
  return choices[Math.floor(Math.random()*choices.length)].id;
};
const emptySkills=():MarketSkills=>({askedPrice:[],confirmed:[],repairs:0,polite:0,hints:0,scenarioSolved:false});
function skillsFromHistory(history:Record<StallId,MarketLine[]>,scenario:MarketScenarioId):MarketSkills{
  const skills=emptySkills();
  for(const stall of STALLS)for(const line of history[stall.id]){
    if(line.role!=='user')continue;
    const text=normalizeVietnamese(line.vi);
    if(/bao nhieu|gia|tien|mot can|moi can/.test(text))skills.askedPrice=[...new Set([...skills.askedPrice,stall.id])];
    if(/tong cong|dung khong|phai khong|xac nhan|hai can|2 can|mot hop|1 hop/.test(text))skills.confirmed=[...new Set([...skills.confirmed,stall.id])];
    skills.repairs+=Number(/xin loi|y toi|khong phai|toi muon noi|noi lai|nhac lai/.test(text));
    skills.polite+=Number(/(?:^|\s)(?:a|cam on|lam on|giup)(?:\s|$)/.test(text));
    skills.scenarioSolved ||= solvedScenario(stall.id,scenario,text);
  }
  return skills;
}
export const newMarket=(scenario:MarketScenarioId='unit'):MarketSave=>({version:2,scenario,quotes:{fruit:110000,gifts:65000,cloth:80000},purchases:{},history:{fruit:[],gifts:[],cloth:[]},visited:[],bargains:[],skills:emptySkills()});
export function readMarket():MarketSave{
  try{const raw=JSON.parse(localStorage.getItem(MARKET_KEY)||'null') as Omit<MarketSave,'version'> & {version:1|2};
    if((raw?.version===1||raw?.version===2)&&raw.purchases&&Array.isArray(raw.visited)&&Array.isArray(raw.bargains)&&STALLS.every(t=>Number.isFinite(raw.quotes?.[t.id])&&raw.quotes[t.id]>=t.floor&&raw.quotes[t.id]<=t.price&&Array.isArray(raw.history?.[t.id])&&raw.history[t.id].every(m=>m&&(m.role==='user'||m.role==='clerk')&&typeof m.vi==='string'&&(m.zh===undefined||typeof m.zh==='string'))&&(raw.purchases[t.id]===undefined||(Number.isFinite(raw.purchases[t.id])&&raw.purchases[t.id]! >=t.floor&&raw.purchases[t.id]! <=t.price)))){
      const scenario=MARKET_SCENARIOS.some(item=>item.id===raw.scenario)?raw.scenario:'unit';
      const s:MarketSave={...raw,version:2,scenario,skills:raw.skills&&Array.isArray(raw.skills.askedPrice)&&Array.isArray(raw.skills.confirmed)&&Number.isFinite(raw.skills.repairs)&&Number.isFinite(raw.skills.polite)&&Number.isFinite(raw.skills.hints)&&typeof raw.skills.scenarioSolved==='boolean'?raw.skills:skillsFromHistory(raw.history,scenario)};
      if(balance(s)>=0)return s;
    }
  }catch{}return newMarket();
}
export const balance=(s:MarketSave)=>MARKET_BUDGET-Object.values(s.purchases).reduce((a,b)=>a+(b||0),0);
export const marketComplete=(s:MarketSave)=>s.purchases.fruit!==undefined&&s.purchases.gifts!==undefined&&s.bargains.some(id=>s.purchases[id]!==undefined);
export const marketOpening=(s:MarketSave,id:StallId):MarketLine=>{
  const scenario=scenarioFor(s);
  return scenario.stall===id?{role:'clerk',vi:scenario.vi,zh:scenario.zh,source:'local'}:{role:'clerk',vi:'Chào bạn! Bạn muốn xem gì?',zh:'你好！想看看什么？',source:'local'};
};
export const priceKnown=(s:MarketSave,id:StallId)=>s.skills.askedPrice.includes(id)||s.bargains.includes(id)||s.purchases[id]!==undefined;
const has=(text:string,pattern:RegExp)=>pattern.test(text);
const solvedScenario=(id:StallId,scenario:MarketScenarioId,text:string)=>scenario==='unit'&&id==='fruit'?has(text,/hai can|2 can|tong cong|ca hai/):scenario==='wrap'&&id==='gifts'?has(text,/goi qua|goi lai|lam qua|khong can goi|de tang|tang ban|tang me/):scenario==='fabric'&&id==='cloth'?has(text,/mau xanh|mau do|mau gi|chat lieu|vai gi|(?:^|\s)(?:xanh|do)(?:\s|$)/):false;
export function marketTurn(s:MarketSave,id:StallId,input:string):{state:MarketSave;reply:MarketLine;event:string}{
  const t=STALLS.find(t=>t.id===id)!,text=normalizeVietnamese(input),old=s.quotes[id];
  let price=old,event='question',vi=`Bạn muốn biết gì về ${t.itemVi}?`,zh=`你想了解${t.item}的什么信息？`;
  const askedPrice=has(text,/bao nhieu|gia|tien|mot can|moi can/);
  if(askedPrice){vi=id==='fruit'&&s.scenario==='unit'?`Xoài ${old/2000} nghìn một cân; hai cân là ${old/1000} nghìn đồng.`:`${t.itemVi} giá ${old/1000} nghìn đồng.`;zh=id==='fruit'&&s.scenario==='unit'?`芒果每公斤 ${money(old/2)}，两公斤共 ${money(old)}。`:`${t.item}共 ${money(old)}。`;event=id==='fruit'&&s.scenario==='unit'?'price-unit':'price';}
  if(/bot|giam|dat qua|re hon|mac qua/.test(text)){
    const raw=text.match(/\b(\d{1,6})(?:\s*(?:nghin|ngan|k))?\b/),offer=raw?Number(raw[1])*(Number(raw[1])<1000?1000:1):old-5000;
    price=offer<t.floor?old:Math.min(old,offer);event=offer<t.floor?'offer-too-low':'bargain';
    vi=offer<t.floor?`Mức đó thấp quá. ${old/1000} nghìn là giá hiện tại.`:price<old?`Được, ${price/1000} nghìn cho ${t.itemVi} nhé.`:`${old/1000} nghìn là giá tốt nhất rồi bạn ạ.`;
    zh=offer<t.floor?`这个价格太低了，目前是 ${money(old)}。`:price<old?`可以，${t.item}给你 ${money(price)}。`:`${money(old)} 已经是最低价啦。`;
  }else if(s.scenario==='wrap'&&id==='gifts'&&solvedScenario(id,s.scenario,text)){
    const decline=has(text,/khong can goi|khong muon goi/),request=has(text,/goi qua|goi lai|lam qua/)&&!decline;
    vi=`${askedPrice?vi+' ':''}${decline?'Được, tôi sẽ không gói nhé.':request?'Được, tôi sẽ gói quà miễn phí cho bạn.':'Mua để tặng à? Tôi có thể gói quà miễn phí.'}`;
    zh=`${askedPrice?zh+' ':''}${decline?'好的，那就不包装。':request?'好的，我会免费帮你包装。':'是买来送人的吗？我可以免费包装。'}`;
    event=askedPrice?'price-wrap':'gift-wrap';
  }else if(s.scenario==='fabric'&&id==='cloth'&&solvedScenario(id,s.scenario,text)){
    const color=has(text,/(?:^|\s)xanh(?:\s|$)/)?'xanh':has(text,/(?:^|\s)do(?:\s|$)/)?'đỏ':null;
    vi=`${askedPrice?vi+' ':''}${color?`Vâng, khăn màu ${color} đây. Bạn muốn xem không?`:'Có màu xanh và màu đỏ. Bạn muốn xem màu nào?'}`;
    zh=`${askedPrice?zh+' ':''}${color?`好的，这是${color==='xanh'?'蓝色':'红色'}围巾。要看看吗？`:'有蓝色和红色，你想看哪一种？'}`;
    event=askedPrice?'price-color':'color';
  }
  else if(/xin loi|y toi|khong phai|toi muon noi/.test(text)){vi='Không sao, bạn nói lại giúp tôi nhé.';zh='没关系，请再说一遍。';event='repair';}
  else if(/tuoi|ngon|chat luong|qua|tang/.test(text)){vi=`${t.itemVi} rất hợp đấy. Bạn muốn xem không?`;zh=`${t.item}很合适，要看一下吗？`;}
  else if(/mua|lay|dong y|thanh toan/.test(text)){vi=`Tổng cộng ${old/1000} nghìn đồng. Bạn xác nhận nhé?`;zh=`总共 ${money(old)}，请确认购买。`;event='confirm';}
  if(s.purchases[id]!==undefined){price=old;event='purchased';vi='Cảm ơn bạn! Hẹn gặp lại.';zh='谢谢你，下次见！';}
  const reply:MarketLine={role:'clerk',vi,zh,source:'local'};
  const confirmed=has(text,/tong cong|dung khong|phai khong|xac nhan|hai can|2 can|mot hop|1 hop/);
  const skills:MarketSkills={...s.skills,
    askedPrice:askedPrice?[...new Set([...s.skills.askedPrice,id])]:s.skills.askedPrice,
    confirmed:confirmed?[...new Set([...s.skills.confirmed,id])]:s.skills.confirmed,
    repairs:s.skills.repairs+Number(has(text,/xin loi|y toi|khong phai|toi muon noi|noi lai|nhac lai/)),
    polite:s.skills.polite+Number(has(text,/(?:^|\s)(?:a|cam on|lam on|giup)(?:\s|$)/)),
    scenarioSolved:s.skills.scenarioSolved||solvedScenario(id,s.scenario,text)};
  return{state:{...s,skills,quotes:{...s.quotes,[id]:price},bargains:price<old?[...new Set([...s.bargains,id])]:s.bargains,history:{...s.history,[id]:[...s.history[id],{role:'user',vi:input},reply].slice(-30)}},reply,event};
}
export function buyMarket(s:MarketSave,id:StallId):MarketSave{
  if(s.purchases[id]!==undefined||s.quotes[id]>balance(s)||!priceKnown(s,id))return s;
  return{...s,purchases:{...s.purchases,[id]:s.quotes[id]}};
}
export function marketScore(s:MarketSave){
  const task=Number(s.purchases.fruit!==undefined)*15+Number(s.purchases.gifts!==undefined)*15+Number(s.bargains.some(id=>s.purchases[id]!==undefined))*15;
  const comprehension=Number(s.skills.askedPrice.includes('fruit'))*5+Number(s.skills.askedPrice.includes('gifts'))*5+Number(s.skills.confirmed.includes('fruit'))*5+Number(s.skills.confirmed.includes('gifts'))*5;
  const turns=STALLS.flatMap(t=>s.history[t.id]).filter(line=>line.role==='user');
  const meaningful=turns.filter(line=>has(normalizeVietnamese(line.vi),/bao nhieu|gia|tien|can|hop|mua|lay|bot|giam|mau|qua|tang|xin loi|chao|cam on/));
  const expression=Math.min(12,meaningful.length*3)+Number(meaningful.some(line=>/[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]/i.test(line.vi)))*4+Number(s.skills.repairs>0)*4;
  const strategy=Number(s.skills.scenarioSolved)*6+Number(s.bargains.length>0)*4;
  const politeness=Math.min(5,s.skills.polite*2);
  return{task,comprehension,expression,strategy,politeness,total:task+comprehension+expression+strategy+politeness};
}
export function marketAdvice(s:MarketSave){
  const advice:string[]=[];
  if(!s.skills.askedPrice.includes('fruit'))advice.push('先问清每公斤的价格：Xoài này bao nhiêu tiền một cân ạ?');
  if(!s.skills.confirmed.includes('fruit'))advice.push('买两公斤前复述总价：Hai cân, tổng cộng bao nhiêu tiền ạ?');
  if(!s.skills.askedPrice.includes('gifts'))advice.push('在伴手礼摊先询价：Một hộp bánh đậu xanh bao nhiêu tiền ạ?');
  if(!s.skills.scenarioSolved)advice.push(`本局「${scenarioFor(s).label}」还未解开：${scenarioFor(s).clue}`);
  if(!s.bargains.length)advice.push('试着礼貌议价：Nếu lấy hai cân, cô bớt một chút được không ạ?');
  if(!s.skills.polite)advice.push('句末加“ạ”，会让问价和请求更礼貌。');
  return advice.length?advice.slice(0,3):['你已经完成问价、核对和议价；下次可换一种说法再挑战。'];
}
export function marketHint(s:MarketSave,id:StallId,level:1|2|3){
  const item=STALLS.find(stall=>stall.id===id)!;
  if(level===1)return id==='fruit'?'关键词：xoài（芒果）· một cân（每公斤）· bao nhiêu（多少）':id==='gifts'?'关键词：bánh đậu xanh（绿豆糕）· một hộp（一盒）· giá（价格）':'关键词：khăn（围巾）· màu（颜色）· bao nhiêu（多少）';
  if(level===2)return `试着组成一句问价：${item.itemVi} + bao nhiêu tiền ạ?`;
  return id==='fruit'?'Cô ơi, xoài này bao nhiêu tiền một cân ạ?':id==='gifts'?'Một hộp bánh đậu xanh bao nhiêu tiền ạ?':'Chiếc khăn này bao nhiêu tiền ạ?';
}
// Every journey stays on the broad central aisle; stall fronts are outside their footprints.
export function marketRoute(start:{x:number;z:number},id:StallId){
  const t=STALLS.find(t=>t.id===id)!,end={x:t.x,z:t.z<0?t.z+2.3:t.z-2.3};
  return[start,{x:start.x,z:0},{x:end.x,z:0},end].filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.01);
}
