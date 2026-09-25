import{describe,expect,it}from'vitest';
import{analyzeAttempts,analyzeContextualConfirmation,analyzeConversation,analyzeMessage,clerkReply,combineClerkAcknowledgement,completedCount,emptyAssessment,emptyCriteria,finalScore,generateOrderTarget,mergeAssessment,mergeCriteria,normalizeVietnamese,spokenOrder,OrderTarget}from'./engine';
const milkOrder:OrderTarget={product:'milk-iced',quantity:1,sugar:'less',service:'takeaway'};
describe('越南语规则识别',()=>{
  it('忽略声调、大小写和多余空格',()=>expect(normalizeVietnamese('  CÀ   PHÊ SỮA ĐÁ  ')).toBe('ca phe sua da'));
  it('识别完整随机订单信息',()=>{const result=mergeCriteria(emptyCriteria,analyzeMessage('Cho toi mot ly ca phe sua da it duong mang di',milkOrder));expect(completedCount(result)).toBe(4);expect(result).toMatchObject({product:true,quantity:true,sugar:true,service:true,payment:false})});
  it('识别付款确认',()=>expect(analyzeMessage('Tôi thanh toán bằng tiền mặt',milkOrder).payment).toBe(true));
  it('可生成不同商品、杯数、糖量和用餐方式',()=>{expect(generateOrderTarget(()=>0)).toEqual({product:'milk-iced',quantity:1,sugar:'none',service:'takeaway'});expect(generateOrderTarget(()=>.99)).toEqual({product:'egg',quantity:2,sugar:'normal',service:'here'})});
  it('上咖啡画面跟随玩家最后说出的饮品、杯数与外带方式',()=>{expect(spokenOrder(['Cho tôi một ly cà phê đen đá.','Xin đổi thành hai ly bạc xỉu, uống tại chỗ.'],milkOrder)).toEqual({product:'bac-xiu',quantity:2,sugar:'less',service:'here'})});
});
describe('对话累计理解',()=>{
  it('一句中同时出现商品和少糖时不会再次询问糖量',()=>{const state=analyzeConversation(['Cho toi ca phe sua da va it duong'],milkOrder);expect(state.product).toBe(true);expect(state.sugar).toBe(true);expect(clerkReply(state,['Cho toi ca phe sua da va it duong'],milkOrder).zh).toBe('你需要一杯，对吗？')});
  it('只说咖啡时询问咖啡种类而非重复询问喝什么',()=>{const state=analyzeConversation(['Ca phe'],milkOrder);const reply=clerkReply(state,['Ca phe'],milkOrder);expect(reply.zh).toContain('冰牛奶咖啡');expect(reply.zh).not.toBe('你想点什么？')});
  it('补充数量后跳过已回答的糖量，继续问用餐方式',()=>{const inputs=['Cho toi ca phe sua da va it duong','Mot ly'];expect(clerkReply(analyzeConversation(inputs,milkOrder),inputs,milkOrder).zh).toBe('堂食还是带走？')});
  it('识别多种咖啡及糖量',()=>{expect(analyzeMessage('hai ly ca phe den da khong duong tai cho',{product:'black-iced',quantity:2,sugar:'none',service:'here'})).toMatchObject({product:true,quantity:true,sugar:true,service:true});expect(analyzeMessage('bac xiu duong binh thuong',{product:'bac-xiu',quantity:1,sugar:'normal',service:'takeaway'})).toMatchObject({product:true,sugar:true})});
});
describe('一次作答评判',()=>{
  it('同一句中的正确和错误项目分别记录',()=>expect(analyzeAttempts('hai ly ca phe sua da it duong mang di',milkOrder)).toMatchObject({product:'correct',quantity:'incorrect',sugar:'correct',service:'correct'}));
  it('只说咖啡不消耗商品的一次作答机会',()=>expect(analyzeAttempts('Cà phê',milkOrder).product).toBeUndefined());
  it('能结合店员上一句确认问题理解“对”并完成数量',()=>expect(analyzeContextualConfirmation('对',{vi:'Bạn muốn gọi một ly phải không?',zh:'你需要一杯，对吗？'},emptyAssessment,milkOrder)).toEqual({quantity:'correct'}));
  it('没有明确确认问题时，单独回答“对”不会凭空得分',()=>expect(analyzeContextualConfirmation('对',{vi:'Bạn muốn gọi món gì?',zh:'你想点什么？'},emptyAssessment,milkOrder)).toEqual({}));
  it('支持越南语肯定回答确认店员复述的订单信息',()=>expect(analyzeContextualConfirmation('Đúng rồi',{vi:'Một ly cà phê sữa đá ít đường mang đi, đúng không?'},emptyAssessment,milkOrder)).toEqual({product:'correct',quantity:'correct',sugar:'correct',service:'correct'}));
  it('首次明确作答后锁定结果，不能用后续答案补分',()=>{const first=mergeAssessment(emptyAssessment,{product:'incorrect'});expect(mergeAssessment(first,{product:'correct'}).product).toBe('incorrect')});
  it('AI 如果追问已作答项，使用程序决定的下一问',()=>{const next={vi:'Bạn muốn thanh toán bằng cách nào?',zh:'你想如何付款？'};expect(combineClerkAcknowledgement({vi:'Bạn muốn cà phê gì?',zh:'你要什么咖啡？'},next)).toEqual(next)});
  it('只要有一项答错，综合分不会被语言分抬到优秀档',()=>expect(finalScore({product:'incorrect',quantity:'correct',sugar:'correct',service:'correct',payment:'correct'},25,0)).toBe(79));
});
