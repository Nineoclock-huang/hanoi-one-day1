import type { Correction } from './notebook';

export default function CorrectionView({ original, correction }: { original: string; correction?: Correction }) {
  if (!correction || typeof correction.span !== 'string' || typeof correction.corrected !== 'string' || typeof correction.explanation !== 'string') return <>{original}</>;
  const at = original.toLocaleLowerCase().indexOf(correction.span.toLocaleLowerCase());
  if (at < 0) return <>{original}</>;
  return <><span className="learner-expression">{original.slice(0, at)}<mark className="learner-error" title={correction.explanation}>{original.slice(at, at + correction.span.length)}</mark>{original.slice(at + correction.span.length)}</span><span className="learner-correction"><b>{correction.source === 'ai' ? 'AI 纠错' : '基础纠错'} · {correction.kind === 'word-order' ? '语序' : correction.kind === 'grammar' ? '语法' : correction.kind === 'vocabulary' ? '词汇' : '拼写'}</b><br />建议：{correction.corrected}<br />{correction.explanation}</span></>;
}
