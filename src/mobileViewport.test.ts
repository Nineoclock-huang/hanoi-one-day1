import{describe,expect,it}from'vitest';
import{keyboardIsOpen}from'./mobileViewport';

describe('mobile visual viewport',()=>{
  it('treats the iOS keyboard height loss as keyboard open',()=>expect(keyboardIsOpen(844,430)).toBe(true));
  it('ignores normal browser toolbar size changes',()=>expect(keyboardIsOpen(844,770)).toBe(false));
});
