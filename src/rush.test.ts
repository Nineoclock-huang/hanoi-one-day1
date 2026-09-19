import { describe, expect, it } from 'vitest';
import { emptyAssessment } from './engine';
import { applyQuestionTimeout, averageResponseTime, formatCountdown, rushPenalty } from './rush';

describe('限时挑战规则', () => {
  it('用毫秒格式显示倒计时', () => {
    expect(formatCountdown(12_000)).toBe('00:12.000');
    expect(formatCountdown(4_032)).toBe('00:04.032');
    expect(formatCountdown(-1)).toBe('00:00.000');
  });

  it('超时锁定当前首个未回答目标并扣分', () => {
    const first = applyQuestionTimeout(emptyAssessment);
    expect(first.key).toBe('product');
    expect(first.assessment.product).toBe('incorrect');
    expect(rushPenalty(2)).toBe(10);
  });

  it('计算平均答题时间', () => {
    expect(averageResponseTime([1000, 2000, 3000])).toBe(2000);
  });
});
