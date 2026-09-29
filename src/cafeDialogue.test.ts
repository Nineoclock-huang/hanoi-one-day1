import { describe, expect, it } from 'vitest';
import { emptyAssessment, mergeAssessment, type OrderTarget } from './engine';
import { cafeQuestion, cafeReplyConflicts, dialogueAssessment, emptyCafeOrder, interpretCafeAnswer, nextCafeField, updateCafeOrder } from './cafeDialogue';
const target: OrderTarget = { product: 'black-iced', quantity: 1, sugar: 'none', service: 'takeaway' };
const sugarQuestion = { vi: 'Bạn muốn thêm đường không?' };

describe('咖啡馆上下文与订单独立记忆', () => {
  it('无糖短答绑定糖量问题，带走后不再回头问糖', () => {
    let order = updateCafeOrder(emptyCafeOrder(), interpretCafeAnswer('một ly cà phê đen đá', undefined, target), {}, target);
    const answer = interpretCafeAnswer('Không', sugarQuestion, target);
    expect(answer.attempts).toEqual({ sugar: 'correct' });
    order = updateCafeOrder(order, answer, {}, target);
    order = updateCafeOrder(order, interpretCafeAnswer('mang di', { vi: 'Bạn uống ở đây hay mang đi?' }, target), {}, target);
    expect(nextCafeField(order)).toBe('payment');
    expect(cafeReplyConflicts({ vi: 'Rồi, mang đi. Còn đường thì sao: không đường, ít đường hay đường bình thường?', zh: '好的，带走。糖呢？' }, order)).toBe(true);
  });
  it('相同的 Không 回答外带问题，不误认成无糖', () => {
    expect(interpretCafeAnswer('Không', { vi: 'Bạn mang đi phải không?' }, target).values).toEqual({ service: 'here' });
    expect(interpretCafeAnswer('Không', { vi: 'Bạn uống gì?' }, target).values).toEqual({});
  });
  it('一句内先复述咖啡再问糖量，短答只回答后面的糖量问题', () => {
    expect(interpretCafeAnswer('Không', { vi: 'Một ly cà phê đen đá, bạn muốn thêm đường không?' }, target).attempts).toEqual({ sugar: 'correct' });
  });
  it('多个选择问题不猜测否定回答', () => {
    expect(interpretCafeAnswer('Không', { vi: 'Bạn muốn thêm đường và mang đi không?' }, target).attempts).toEqual({});
  });
  it('肯定只能确认最后的提问，不确认前面复述中的其他字段', () => {
    const answer = interpretCafeAnswer('对', { vi: 'Cà phê đen đá không đường. Một ly, đúng không?' }, target);
    expect(answer.attempts).toEqual({ quantity: 'correct' });
  });
  it('确认错误的数量判错，不按目标杯数凭空给分', () => {
    expect(interpretCafeAnswer('Đúng rồi', { vi: 'Hai ly, phải không?' }, target).attempts).toEqual({ quantity: 'incorrect' });
  });
  it('后续改口更新真实订单，但首次得分不变', () => {
    const wrong = interpretCafeAnswer('ít đường', sugarQuestion, target);
    const firstScore = mergeAssessment(emptyAssessment, wrong.attempts);
    let order = updateCafeOrder(emptyCafeOrder(), wrong, {}, target);
    const change = interpretCafeAnswer('không đường', undefined, target);
    order = updateCafeOrder(order, change, {}, target);
    expect(order.values.sugar).toBe('none');
    expect(mergeAssessment(firstScore, change.attempts).sugar).toBe('incorrect');
    expect(dialogueAssessment(order, target).sugar).toBe('correct');
  });
  it('明确多项回答一次性更新，不重复问其中任何项', () => {
    const order = updateCafeOrder(emptyCafeOrder(), interpretCafeAnswer('  MOT ly CA PHE DEN DA khong duong mang di ', undefined, target), {}, target);
    expect(nextCafeField(order)).toBe('payment');
  });
  it('AI 错误判断只记录已尝试，不凭空补目标订单', () => {
    const order = updateCafeOrder(emptyCafeOrder(), interpretCafeAnswer('anything', undefined, target), { product: 'incorrect' }, target);
    expect(order.known.product).toBe(true);
    expect(order.values.product).toBeUndefined();
  });
  it('数量识别不把 phải 里面的 hai 当成两杯', () => {
    expect(interpretCafeAnswer('phải rồi', undefined, target).attempts.quantity).toBeUndefined();
  });
  it('选项不是确认，回答“对”不消耗机会', () => {
    expect(cafeQuestion({ vi: 'Bạn muốn một ly hay hai ly?' }).isConfirmation).toBe(false);
    expect(interpretCafeAnswer('对', { vi: 'Bạn muốn một ly hay hai ly?' }, target).attempts).toEqual({});
  });
});

describe('店员回复防矛盾检查', () => {
  const order = updateCafeOrder(emptyCafeOrder(), interpretCafeAnswer('một ly cà phê đen đá không đường mang đi', undefined, target), {}, target);
  it('复述已知订单再问付款是正常的 AI 回复', () => {
    expect(cafeReplyConflicts({ vi: 'Một ly cà phê đen đá không đường, mang đi. Bạn thanh toán bằng tiền mặt hay chuyển khoản?', zh: '一杯无糖冰黑咖啡，带走。现金还是转账？' }, order)).toBe(false);
  });
  it('不能说一杯后又问几杯', () => {
    expect(cafeReplyConflicts({ vi: 'Rồi, một ly. Bạn muốn mấy ly?', zh: '好，一杯。要几杯？' }, order)).toBe(true);
  });
  it('不能把玩家的实际无糖订单复述成少糖', () => {
    expect(cafeReplyConflicts({ vi: 'Ít đường. Bạn thanh toán bằng cách nào?', zh: '少糖。如何付款？' }, order)).toBe(true);
  });
  it('订单完成后不能再提问，正常告别可通过', () => {
    const complete = { ...order, known: { ...order.known, payment: true }, payment: true };
    expect(cafeReplyConflicts({ vi: 'Cảm ơn! Bạn muốn thêm đường không?', zh: '谢谢，还要加糖吗？' }, complete)).toBe(true);
    expect(cafeReplyConflicts({ vi: 'Cảm ơn! Đồ uống sẽ có ngay.', zh: '谢谢，饮品马上就好。' }, complete)).toBe(false);
  });
});
