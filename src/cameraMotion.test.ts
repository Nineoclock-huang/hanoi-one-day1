import {describe,expect,it} from 'vitest';
import {cameraTransitionDuration,easeInOutCubic} from './cameraMotion';

describe('city camera motion',()=>{
  it('starts and ends exactly at the selected views',()=>{
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it('eases through the midpoint without overshooting',()=>{
    expect(easeInOutCubic(.25)).toBeCloseTo(.0625);
    expect(easeInOutCubic(.5)).toBe(.5);
    expect(easeInOutCubic(2)).toBe(1);
  });
  it('respects reduced-motion preferences',()=>{
    expect(cameraTransitionDuration(false)).toBe(720);
    expect(cameraTransitionDuration(true)).toBe(0);
  });
});
