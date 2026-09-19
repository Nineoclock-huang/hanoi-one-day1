import { describe, expect, it } from 'vitest';
import { renderQuality } from './renderQuality';
describe('high quality fixed city rendering', () => {
  it('keeps the original high-DPI quality on phones', () => {
    expect(renderQuality(402, 3)).toEqual({pixelRatio: 1.5, shadowSize: 2048});
  });
  it('retains desktop quality without oversampling low-DPI screens', () => {
    expect(renderQuality(1440, 2).pixelRatio).toBe(1.5);
    expect(renderQuality(1440, 1).pixelRatio).toBe(1);
    expect(renderQuality(1440, 1).shadowSize).toBe(2048);
  });
});
