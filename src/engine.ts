export type Criteria={product:boolean;quantity:boolean;sugar:boolean;service:boolean;payment:boolean};
export type ProductId='milk-iced'|'black-iced'|'bac-xiu'|'egg';
export type SugarId='none'|'less'|'normal';
export type ServiceId='takeaway'|'here';
export type OrderTarget={product:ProductId;quantity:1|2;sugar:SugarId;service:ServiceId};

export const emptyCriteria:Criteria={product:false,quantity:false,sugar:false,service:false,payment:false};
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
export function analyzeMessage(input:string,target=currentOrderTarget):Partial<Criteria>{const text=normalizeVietnamese(input);return{product:detectedProduct(text)===target.product,quantity:detectedQuantity(text)===target.quantity,sugar:detectedSugar(text)===target.sugar,service:detectedService(text)===target.service,payment:any(text,paymentTerms)}}
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
