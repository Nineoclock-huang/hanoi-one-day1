export type MistakeKind = 'grammar' | 'word-order' | 'vocabulary' | 'spelling';
export type Correction = { kind: MistakeKind; span: string; replacement: string; corrected: string; explanation: string; source: 'ai' | 'local' };
export type Mistake = Correction & { id: string; scene: 'cafe' | 'market'; original: string; createdAt: string; count: number };
export const NOTEBOOK_KEY = 'hanoi-one-day-mistakes-v1';
export const kindLabels: Record<MistakeKind, string> = { grammar: '语法', 'word-order': '语序', vocabulary: '词汇', spelling: '拼写' };

export function validateCorrection(value: unknown, original: string, source: 'ai' | 'local'): Correction | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!['grammar', 'word-order', 'vocabulary', 'spelling'].includes(String(item.kind))) return null;
  const span = typeof item.span === 'string' ? item.span.trim() : '';
  const replacement = typeof item.replacement === 'string' ? item.replacement.trim() : '';
  const corrected = typeof item.corrected === 'string' ? item.corrected.trim() : '';
  const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
  if (!span || !replacement || !corrected || !explanation || span.length > 120 || corrected.length > 320 || explanation.length > 180) return null;
  const index = original.toLocaleLowerCase().indexOf(span.toLocaleLowerCase());
  if (index < 0 || original.slice(0, index) + replacement + original.slice(index + span.length) !== corrected) return null;
  if (corrected === original) return null;
  return { kind: item.kind as MistakeKind, span: original.slice(index, index + span.length), replacement, corrected, explanation, source };
}

export function localCorrection(original: string): Correction | null {
  const patterns: { re: RegExp; kind: MistakeKind; replacement: string; explanation: string }[] = [
    { re: /cà phê đá sữa|ca phe da sua/i, kind: 'word-order', replacement: 'cà phê sữa đá', explanation: '越南语“冰牛奶咖啡”通常说“cà phê sữa đá”，牛奶在冰之前。' },
    { re: /bao nhiêu giá|bao nhieu gia/i, kind: 'word-order', replacement: 'giá bao nhiêu', explanation: '问价格时通常把“giá”放在“bao nhiêu”之前。' },
    { re: /tôi là muốn|toi la muon/i, kind: 'grammar', replacement: 'tôi muốn', explanation: '表达“我想要”直接用“tôi muốn”，不需要“là”。' },
  ];
  for (const pattern of patterns) {
    const match = original.match(pattern.re);
    if (!match || match.index === undefined) continue;
    const corrected = original.slice(0, match.index) + pattern.replacement + original.slice(match.index + match[0].length);
    return validateCorrection({ kind: pattern.kind, span: match[0], replacement: pattern.replacement, corrected, explanation: pattern.explanation }, original, 'local');
  }
  return null;
}

export function readNotebook(): Mistake[] {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && (item.scene === 'cafe' || item.scene === 'market') && typeof item.original === 'string' && validateCorrection(item, item.original, item.source === 'ai' ? 'ai' : 'local')).slice(0, 100);
  } catch { return []; }
}

export function addMistake(previous: Mistake[], scene: Mistake['scene'], original: string, correction: Correction): Mistake[] {
  const valid = validateCorrection(correction, original, correction.source);
  if (!valid) return previous;
  const found = previous.find(item => item.scene === scene && item.original === original && item.corrected === valid.corrected);
  if (found) return previous.map(item => item === found ? { ...item, count: item.count + 1, source: valid.source } : item);
  return [{ ...valid, scene, original, id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), count: 1 }, ...previous].slice(0, 100);
}
