import{describe,expect,it}from'vitest';
import{analyzeConversation,analyzeMessage,clerkReply,completedCount,emptyCriteria,generateOrderTarget,mergeCriteria,normalizeVietnamese,OrderTarget}from'./engine';
const milkOrder:OrderTarget={product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'};
describe('越南语规则识别',()=>{
  it('忽略声调、大小写和多余空格',()=>expect(normalizeVietnamese('  CÀ   PHÊ SỮA ĐÁ  ')).toBe('ca phe sua da'));
  it('识别完整随机订单信息',()=>{const result=mergeCriteria(emptyCriteria,analyzeMessage('Cho toi mot ly ca phe sua da it duong mang di',milkOrder));expect(completedCount(result)).toBe(4);expect(result).toMatchObject({product:true,quantity:true,sugar:true,service:true,payment:false})});
  it('识别付款确认',()=>expect(analyzeMessage('Tôi thanh toán bằng tiền mặt',milkOrder).payment).toBe(true));
  it('可生成不同商品、杯数、糖量和用餐方式',()=>{expect(generateOrderTarget(()=>0)).toEqual({product:'milk-iced',quantity:1,sugar:'none',service:'takeaway'});expect(generateOrderTarget(()=>.99)).toEqual({product:'egg',quantity:2,sugar:'normal',service:'here'})});
});
describe('对话累计理解',()=>{
  it('一句中同时出现商品和少糖时不会再次询问糖量',()=>{const state=analyzeConversation(['Cho toi ca phe sua da va it duong'],milkOrder);expect(state.product).toBe(true);expect(state.sugar).toBe(true);expect(clerkReply(state,['Cho toi ca phe sua da va it duong'],milkOrder).zh).toBe('你需要一杯，对吗？')});
  it('只说咖啡时询问咖啡种类而非重复询问喝什么',()=>{const state=analyzeConversation(['Ca phe'],milkOrder);const reply=clerkReply(state,['Ca phe'],milkOrder);expect(reply.zh).toContain('冰牛奶咖啡');expect(reply.zh).not.toBe('你想点什么？')});
  it('补充数量后跳过已回答的糖量，继续问用餐方式',()=>{const inputs=['Cho toi ca phe sua da va it duong','Mot ly'];expect(clerkReply(analyzeConversation(inputs,milkOrder),inputs,milkOrder).zh).toBe('堂食还是带走？')});
  it('识别多种咖啡及糖量',()=>{expect(analyzeMessage('hai ly ca phe den da khong duong tai cho',{product:'black-iced',quantity:2,sugar:'none',service:'here'})).toMatchObject({product:true,quantity:true,sugar:true,service:true});expect(analyzeMessage('bac xiu duong binh thuong',{product:'bac-xiu',quantity:1,sugar:'normal',service:'takeaway'})).toMatchObject({product:true,sugar:true})});
});
