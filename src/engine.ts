export type Criteria={product:boolean;quantity:boolean;sugar:boolean;service:boolean;payment:boolean};
export type AttemptStatus='pending'|'correct'|'incorrect';
export type Assessment=Record<keyof Criteria,AttemptStatus>;
export type ProductId='milk-iced'|'black-iced'|'bac-xiu'|'egg';
export type SugarId='none'|'less'|'normal';
export type ServiceId='takeaway'|'here';
export type OrderTarget={product:ProductId;quantity:1|2;sugar:SugarId;service:ServiceId};

export const emptyCriteria:Criteria={product:false,quantity:false,sugar:false,service:false,payment:false};
export const emptyAssessment:Assessment={product:'pending',quantity:'pending',sugar:'pending',service:'pending',payment:'pending'};
export function normalizeVietnamese(value:string){return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
const any=(text:string,terms:string[])=>terms.some(term=>text.includes(term));
const products:Record<ProductId,{vi:string;zh:string;terms:string[]}>= {
  'milk-iced':{vi:'cà phê sữa đá',zh:'冰牛奶咖啡',terms:['ca phe sua da','cafe sua da']},
  'black-iced':{vi:'cà phê đen đá',zh:'冰黑咖啡',terms:['ca phe den da','cafe den da']},
  'bac-xiu':{vi:'bạc xỉu',zh:'越南炼乳咖啡',terms:['bac xiu','bac siu']},
  egg:{vi:'cà phê trứng',zh:'鸡蛋咖啡',terms:['ca phe trung','cafe trung']},
};
const sugars:Record<SugarId,{vi:string;zh:string;terms:string[]}>= {
  none:{vi:'không đường',zh:'无糖',terms:['khong duong','khong them duong']},
  less:{vi:'ít đường',zh:'少糖',terms:['it duong','bot duong','giam duong','it ngot','khong qua ngot','nhe duong']},
  normal:{vi:'đường bình thường',zh:'正常糖',terms:['binh thuong','duong binh thuong','duong nhu binh thuong']},
};
const services:Record<ServiceId,{vi:string;zh:string;terms:string[]}>= {
  takeaway:{vi:'mang đi',zh:'带走',terms:['mang di','dem di']},
  here:{vi:'uống tại chỗ',zh:'堂食',terms:['tai cho','uong tai day','uong tai cho']},
};
const quantityTerms:Record<1|2,string[]>={1:['mot ly','1 ly','mot coc','1 coc','mot'],2:['hai ly','2 ly','hai coc','2 coc','hai']};
const paymentTerms=['thanh toan','tra tien','tien mat','chuyen khoan','quet the','the ngan hang'];
const pick=<T,>(items:readonly T[],random=Math.random)=>items[Math.floor(random()*items.length)];
export function generateOrderTarget(random=Math.random):OrderTarget{return{product:pick(Object.keys(products)as ProductId[],random),quantity:pick([1,2]as const,random),sugar:pick(Object.keys(sugars)as SugarId[],random),service:pick(Object.keys(services)as ServiceId[],random)}}
export let currentOrderTarget:OrderTarget=generateOrderTarget();
export const criterionLabels:Record<keyof Criteria,string>={product:'',quantity:'',sugar:'',service:'',payment:'确认付款'};
export const hints=['','',''];
export let recommendedExpression='';
function quantityVi(quantity:1|2){return quantity===1?'một ly':'hai ly'}
function refreshCopy(){const target=currentOrderTarget;criterionLabels.product=products[target.product].zh;criterionLabels.quantity=target.quantity===1?'一杯':'两杯';criterionLabels.sugar=sugars[target.sugar].zh;criterionLabels.service=services[target.service].zh;hints[0]=`先说出商品：${products[target.product].vi}（${products[target.product].zh}）`;hints[1]=`试试数量和甜度：${quantityVi(target.quantity)}, ${sugars[target.sugar].vi}`;hints[2]=`参考表达：Cho tôi ${quantityVi(target.quantity)} ${products[target.product].vi}, ${sugars[target.sugar].vi}, ${services[target.service].vi} nhé.`;recommendedExpression=`Cho tôi ${quantityVi(target.quantity)} ${products[target.product].vi}, ${sugars[target.sugar].vi}, ${services[target.service].vi} nhé. Tôi thanh toán bằng tiền mặt.`}
export function randomizeOrderTarget(random=Math.random){currentOrderTarget=generateOrderTarget(random);refreshCopy();return currentOrderTarget}
refreshCopy();
export function orderSummary(target=currentOrderTarget){return`${target.quantity===1?'一杯':'两杯'}${sugars[target.sugar].zh}${products[target.product].zh}，${services[target.service].zh}`}

function detectedProduct(text:string){return(Object.keys(products)as ProductId[]).find(id=>any(text,products[id].terms))}
function detectedSugar(text:string){return(Object.keys(sugars)as SugarId[]).find(id=>any(text,sugars[id].terms))}
function detectedService(text:string){return(Object.keys(services)as ServiceId[]).find(id=>any(text,services[id].terms))}
function detectedQuantity(text:string){return([1,2]as const).find(value=>any(text,quantityTerms[value]))}
export function spokenOrder(inputs:string[],fallback:OrderTarget):OrderTarget{
  return inputs.reduce((order,input)=>{
    const text=normalizeVietnamese(input);
    return{product:detectedProduct(text)??order.product,quantity:detectedQuantity(text)??order.quantity,sugar:detectedSugar(text)??order.sugar,service:detectedService(text)??order.service};
  },{...fallback});
}
export function analyzeMessage(input:string,target=currentOrderTarget):Partial<Criteria>{const text=normalizeVietnamese(input);return{product:detectedProduct(text)===target.product,quantity:detectedQuantity(text)===target.quantity,sugar:detectedSugar(text)===target.sugar,service:detectedService(text)===target.service,payment:any(text,paymentTerms)}}
export function analyzeAttempts(input:string,target=currentOrderTarget):Partial<Assessment>{const text=normalizeVietnamese(input),product=detectedProduct(text),quantity=detectedQuantity(text),sugar=detectedSugar(text),service=detectedService(text),result:Partial<Assessment>={};if(product)result.product=product===target.product?'correct':'incorrect';if(quantity)result.quantity=quantity===target.quantity?'correct':'incorrect';if(sugar)result.sugar=sugar===target.sugar?'correct':'incorrect';if(service)result.service=service===target.service?'correct':'incorrect';if(any(text,paymentTerms))result.payment='correct';if(any(text,['khong thanh toan','khong tra tien','khong mua nua']))result.payment='incorrect';return result}
const affirmativeVietnamese=new Set(['dung','dung roi','vang','da','phai','phai roi','co','ok','okay','yes']);
function isAffirmative(input:string){const text=normalizeVietnamese(input);return affirmativeVietnamese.has(text)||/^(对|对的|是|是的|没错|嗯+|好的?|可以)[。！! ]*$/.test(input.trim())}
export function analyzeContextualConfirmation(input:string,previous:{vi:string;zh?:string}|undefined,current:Assessment,target=currentOrderTarget):Partial<Assessment>{
  if(!previous||!isAffirmative(input))return{};
  const vi=normalizeVietnamese(previous.vi),zh=previous.zh||'',asksConfirmation=any(vi,['dung khong','phai khong','dung chu','phai chu'])||/(对吗|是吗|是不是|对不对)/.test(zh);
  if(!asksConfirmation)return{};
  const result:Partial<Assessment>={};
  if(current.product==='pending'&&(any(vi,products[target.product].terms)||zh.includes(products[target.product].zh)))result.product='correct';
  const quantityPhrases=target.quantity===1?['mot ly','mot coc','1 ly','1 coc']:['hai ly','hai coc','2 ly','2 coc'];
  if(current.quantity==='pending'&&(any(vi,quantityPhrases)||zh.includes(target.quantity===1?'一杯':'两杯')))result.quantity='correct';
  if(current.sugar==='pending'&&(any(vi,sugars[target.sugar].terms)||zh.includes(sugars[target.sugar].zh)))result.sugar='correct';
  if(current.service==='pending'&&(any(vi,services[target.service].terms)||zh.includes(services[target.service].zh)))result.service='correct';
  if(current.payment==='pending'&&any(vi,paymentTerms))result.payment='correct';
  return result;
}
export function mergeAssessment(current:Assessment,found:Partial<Assessment>):Assessment{return Object.fromEntries((Object.keys(current)as(keyof Assessment)[]).map(key=>[key,current[key]==='pending'&&(found[key]==='correct'||found[key]==='incorrect')?found[key]:current[key]]))as Assessment}
export function resolvedCriteria(assessment:Assessment):Criteria{return Object.fromEntries((Object.keys(assessment)as(keyof Assessment)[]).map(key=>[key,assessment[key]!=='pending']))as Criteria}
export function correctCriteria(assessment:Assessment):Criteria{return Object.fromEntries((Object.keys(assessment)as(keyof Assessment)[]).map(key=>[key,assessment[key]==='correct']))as Criteria}
export const resolvedCount=(assessment:Assessment)=>Object.values(assessment).filter(value=>value!=='pending').length;
export function finalScore(assessment:Assessment,languageScore:number,hintsUsed:number){const objective=Math.max(0,Object.values(assessment).filter(value=>value==='correct').length*15-hintsUsed*2);return Math.min(objective+Math.max(0,Math.min(25,languageScore)),Object.values(assessment).includes('incorrect')?79:100)}
export function mergeCriteria(current:Criteria,found:Partial<Criteria>):Criteria{return Object.fromEntries(Object.keys(current).map(key=>[key,current[key as keyof Criteria]||Boolean(found[key as keyof Criteria])]))as Criteria}
export function analyzeConversation(inputs:string[],target=currentOrderTarget):Criteria{return inputs.reduce((state,input)=>mergeCriteria(state,analyzeMessage(input,target)),{...emptyCriteria})}
export const completedCount=(criteria:Criteria)=>Object.values(criteria).filter(Boolean).length;
export function clerkReply(criteria:Criteria,inputs:string[]=[],target=currentOrderTarget){
  const text=normalizeVietnamese(inputs.at(-1)||'');
  if(!criteria.product){
    const heard=detectedProduct(text);
    if(heard)return{vi:`Mình nghe là ${products[heard].vi}. Nhiệm vụ hôm nay là ${products[target.product].vi}, đúng không?`,zh:`我听到你点了${products[heard].zh}。今天的任务是${products[target.product].zh}，要换成它吗？`};
    if(any(text,['ca phe','cafe']))return{vi:'Bạn muốn cà phê sữa đá, cà phê đen đá, bạc xỉu hay cà phê trứng?',zh:'你想要冰牛奶咖啡、冰黑咖啡、越南炼乳咖啡，还是鸡蛋咖啡？'};
    return{vi:'Bạn muốn gọi món gì?',zh:'你想点什么？'};
  }
  if(!criteria.quantity)return{vi:`Bạn muốn gọi ${target.quantity===1?'một':'hai'} ly phải không?`,zh:`你需要${target.quantity===1?'一':'两'}杯，对吗？`};
  if(!criteria.sugar)return{vi:'Bạn muốn không đường, ít đường hay đường bình thường?',zh:'你想要无糖、少糖，还是正常糖？'};
  if(!criteria.service)return{vi:'Bạn uống tại chỗ hay mang đi?',zh:'堂食还是带走？'};
  if(!criteria.payment)return{vi:'Bạn muốn thanh toán bằng cách nào?',zh:'你想如何付款？'};
  return{vi:'Cảm ơn bạn! Đồ uống của bạn sẽ có ngay.',zh:'谢谢！你的饮品马上就好。'};
}
export function combineClerkAcknowledgement(acknowledgement:{vi:string;zh:string}|null,next:{vi:string;zh:string}){
  if(!acknowledgement||/[?？]/.test(acknowledgement.vi+acknowledgement.zh))return next;
  return{vi:`${acknowledgement.vi} ${next.vi}`,zh:`${acknowledgement.zh} ${next.zh}`};
}
