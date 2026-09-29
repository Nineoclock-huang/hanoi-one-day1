import { analyzeAttempts, clerkReply, emptyCriteria, explicitOrder, normalizeVietnamese, type Assessment, type Criteria, type OrderTarget } from './engine';

export type CafeField = keyof Criteria;
export type CafeOrder = { known: Criteria; values: Partial<OrderTarget>; payment?: boolean };
export type CafeQuestion = { fields: CafeField[]; confirmation: Partial<OrderTarget>; confirmsPayment: boolean; isConfirmation: boolean };
export const cafeFields: CafeField[] = ['product', 'quantity', 'sugar', 'service', 'payment'];
export const emptyCafeOrder = (): CafeOrder => ({ known: { ...emptyCriteria }, values: {} });
const topics: Record<CafeField, RegExp> = {
  product: /ca phe|bac xiu|loai|mon gi|uong gi/,
  quantity: /(?:^| )(?:mot|hai|may|bao nhieu|[12]) (?:ly|coc|tach)|bao nhieu (?:ly|coc|tach)/,
  sugar: /duong|ngot/,
  service: /mang di|dem di|tai cho|tai day|o day/,
  payment: /thanh toan|tra tien|tien mat|chuyen khoan|quet the/,
};

// Only the question clause is interpreted: an acknowledgement is not a new question.
function questionClauses(vi: string) {
  return (vi.match(/[^.!?]+\?/g) || []).map(clause => normalizeVietnamese(clause));
}
function questionIntent(text: string) {
  if (/dung khong|phai khong|dung chu|phai chu/.test(text)) return text;
  const customerQuestion = text.lastIndexOf('ban ');
  return customerQuestion > 0 ? text.slice(customerQuestion) : text;
}
export function cafeQuestion(previous?: { vi: string }): CafeQuestion {
  const clauses = questionClauses(previous?.vi || ''), text = questionIntent(clauses.at(-1) || '');
  const isConfirmation = /dung khong|phai khong|dung chu|phai chu/.test(text);
  return {
    fields: cafeFields.filter(key => topics[key].test(text)),
    confirmation: isConfirmation ? explicitOrder(text) : {},
    confirmsPayment: isConfirmation && topics.payment.test(text),
    isConfirmation,
  };
}
const yes = /^(dung(?: roi)?|vang(?: a)?|da(?: vang)?|phai(?: roi)?|co(?: a)?|ok|okay|yes)$/;
const no = /^(khong(?: a| nhe| dau| co)?|no)$/;

export function interpretCafeAnswer(input: string, previous: { vi: string } | undefined, target: OrderTarget) {
  const text = normalizeVietnamese(input), question = cafeQuestion(previous);
  const values = explicitOrder(input), attempts = analyzeAttempts(input, target);
  let payment = attempts.payment === undefined ? undefined : attempts.payment === 'correct';
  const affirmative = yes.test(text) || /^(对|对的|是|是的|没错|好的?|嗯+)[。！! ]*$/.test(input.trim());
  if (question.isConfirmation && affirmative) {
    Object.assign(values, question.confirmation);
    if (question.confirmsPayment) payment = true;
  }
  // Short answers are scoped to one unambiguous question, never inferred from the task.
  if (question.fields.length === 1) {
    const field = question.fields[0];
    if (field === 'sugar') {
      if (no.test(text)) values.sugar = 'none';
      if (/^(it|it thoi|bot|bot thoi)$/.test(text)) values.sugar = 'less';
    }
    if (field === 'quantity' && /^[12]$/.test(text)) values.quantity = Number(text) as 1 | 2;
    if (field === 'service' && no.test(text)) {
      const clause = questionClauses(previous?.vi || '').at(-1) || '';
      if (/mang di/.test(clause) && !/tai cho|o day|tai day/.test(clause)) values.service = 'here';
      else if (/tai cho|o day|tai day/.test(clause) && !/mang di/.test(clause)) values.service = 'takeaway';
    }
  }
  for (const field of ['product', 'quantity', 'sugar', 'service'] as const) {
    if (values[field] !== undefined) attempts[field] = values[field] === target[field] ? 'correct' : 'incorrect';
  }
  if (payment !== undefined) attempts.payment = payment ? 'correct' : 'incorrect';
  return { values, payment, attempts, question };
}

export function updateCafeOrder(current: CafeOrder, answer: ReturnType<typeof interpretCafeAnswer>, aiAttempts: Partial<Assessment>, target: OrderTarget): CafeOrder {
  const values = { ...current.values, ...answer.values }, known = { ...current.known };
  for (const field of ['product', 'quantity', 'sugar', 'service'] as const) {
    if (answer.values[field] !== undefined) known[field] = true;
    else if (aiAttempts[field]) {
      known[field] = true;
      // An AI incorrect mark does not tell us what was ordered: do not fill the target.
      if (aiAttempts[field] === 'correct') Object.assign(values, { [field]: target[field] });
    }
  }
  const payment = answer.payment ?? (aiAttempts.payment === 'correct' ? true : aiAttempts.payment === 'incorrect' ? false : current.payment);
  if (payment !== undefined) known.payment = true;
  return { known, values, payment };
}
export function nextCafeField(order: CafeOrder) { return cafeFields.find(field => !order.known[field]) || 'complete'; }
// Dialogue knows the current order; first-attempt assessment is supplied separately for scoring.
export function dialogueAssessment(order: CafeOrder, target: OrderTarget): Assessment {
  return Object.fromEntries(cafeFields.map(field => [field, !order.known[field] ? 'pending' : field === 'payment' ? order.payment === false ? 'incorrect' : 'correct' : order.values[field] === target[field] ? 'correct' : 'incorrect'])) as Assessment;
}
export function nextCafePrompt(order: CafeOrder, inputs: string[], target: OrderTarget) {
  return clerkReply(order.known, inputs, target);
}
export function cafeReplyConflicts(reply: { vi: string; zh: string }, order: CafeOrder) {
  const expected = nextCafeField(order), questions = questionClauses(reply.vi).map(questionIntent);
  if (expected === 'complete') return questions.length > 0 || /[?？]/.test(reply.zh);
  const asked = new Set(questions.flatMap(text => cafeFields.filter(field => topics[field].test(text))));
  if ([...asked].some(field => order.known[field])) return true;
  if (asked.size > 0 && !asked.has(expected)) return true;
  // An explicit acknowledgement must agree with known facts, but options in questions may differ.
  const acknowledgement = reply.vi.replace(/[^.!?]+\?/g, ' '), values = explicitOrder(acknowledgement);
  return (['product', 'quantity', 'sugar', 'service'] as const).some(field => values[field] !== undefined && order.values[field] !== undefined && values[field] !== order.values[field]);
}
