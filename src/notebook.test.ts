import { describe, expect, it, vi } from 'vitest';
import { addMistake, localCorrection, readNotebook, validateCorrection, NOTEBOOK_KEY } from './notebook';

describe('shared mistake notebook', () => {
  it('marks only an exact learner span and rejects fabricated corrections', () => {
    const text = 'Tôi muốn ca phe da sua';
    const correction = localCorrection(text)!;
    expect(correction.kind).toBe('word-order');
    expect(correction.corrected).toBe('Tôi muốn cà phê sữa đá');
    expect(validateCorrection({ ...correction, span: 'not in input' }, text, 'ai')).toBeNull();
  });
  it('combines café and market errors and persists them locally', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-id' });
    const cafe = localCorrection('ca phe da sua')!;
    const market = localCorrection('bao nhieu gia')!;
    let entries = addMistake([], 'cafe', 'ca phe da sua', cafe);
    entries = addMistake(entries, 'market', 'bao nhieu gia', market);
    entries = addMistake(entries, 'market', 'bao nhieu gia', market);
    expect(entries).toHaveLength(2);
    expect(entries[0].count).toBe(2);
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(entries));
    expect(readNotebook().map(item => item.scene)).toEqual(['market', 'cafe']);
    vi.unstubAllGlobals();
  });
});
