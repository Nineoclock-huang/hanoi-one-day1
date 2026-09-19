import { describe, expect, it } from 'vitest';
import { renderQuality } from './renderQuality';
describe('adaptive city rendering', () => {
  it('caps high-DPI phone rendering and shadow memory', () => {
    expect(renderQuality(402, 3)).toEqual({pixelRatio: 1, shadowSize: 1024, frameInterval: 50});
  });
  it('retains desktop quality without oversampling low-DPI screens', () => {
    expect(renderQuality(1440, 2).pixelRatio).toBe(1.5);
    expect(renderQuality(1440, 1).pixelRatio).toBe(1);
    expect(renderQuality(1440, 1).shadowSize).toBe(2048);
  });
});
