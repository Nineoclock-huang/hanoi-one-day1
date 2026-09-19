import type { Assessment } from './engine';

export const RUSH_QUESTION_LIMIT_MS = 12_000;
export const RUSH_TIMEOUT_PENALTY = 5;

export function formatCountdown(milliseconds: number) {
  const safe = Math.max(0, Math.ceil(milliseconds));
  const seconds = Math.floor(safe / 1000);
  const millis = safe % 1000;
  return `00:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function nextPendingCriterion(assessment: Assessment): keyof Assessment | null {
  return (Object.keys(assessment) as (keyof Assessment)[]).find(key => assessment[key] === 'pending') ?? null;
}

export function applyQuestionTimeout(assessment: Assessment) {
  const key = nextPendingCriterion(assessment);
  return {
    key,
    assessment: key ? { ...assessment, [key]: 'incorrect' as const } : assessment,
  };
}

export function rushPenalty(timeouts: number) {
  return Math.max(0, timeouts) * RUSH_TIMEOUT_PENALTY;
}

export function averageResponseTime(times: number[]) {
  return times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : 0;
}
