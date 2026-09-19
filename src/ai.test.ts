import { describe, expect, it } from 'vitest';
import { trustedAiAttempts, type AiReply } from './ai';

const reply = (overrides: Partial<AiReply>): AiReply => ({ vi: 'Được.', zh: '好的。', ...overrides });

describe('AI 任务判断证据校验', () => {
  it('接受高置信度且能在玩家原话中找到的字段证据', () => {
    const result = trustedAiAttempts(reply({
      attempts: { quantity: 'correct', sugar: 'correct' },
      evidence: { quantity: 'hai ly', sugar: 'ít đường' },
      confidence: { quantity: .96, sugar: .91 },
    }), 'Cho tôi hai ly cà phê, ít đường.');
    expect(result).toEqual({ quantity: 'correct', sugar: 'correct' });
  });

  it('拒绝 AI 凭空补出的商品与低置信度判断', () => {
    const result = trustedAiAttempts(reply({
      attempts: { product: 'correct', service: 'correct' },
      evidence: { product: 'cà phê sữa đá', service: 'mang đi' },
      confidence: { product: .99, service: .62 },
    }), 'Cho tôi cà phê, mang đi.');
    expect(result).toEqual({});
  });

  it('泛称咖啡不能被 AI 当成指定咖啡品种', () => {
    const result = trustedAiAttempts(reply({
      attempts: { product: 'correct' },
      evidence: { product: 'cà phê' },
      confidence: { product: .95 },
    }), 'Cà phê.');
    expect(result).toEqual({});
  });
});
