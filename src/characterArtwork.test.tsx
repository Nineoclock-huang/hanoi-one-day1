import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Serving } from './App';
import CityScene from './CityScene';
import { danSpriteName, lacSpriteName } from './loading';

vi.mock('./cityRenderer', () => ({ mountCity: () => { throw new Error('WebGL unavailable'); } }));
afterEach(() => { cleanup(); localStorage.clear(); });

it('两位店员端咖啡时使用各自的虚构角色立绘', () => {
  const order = { product: 'milk-iced' as const, quantity: 1 as const, sugar: 'less' as const, service: 'here' as const };
  const view = render(<Serving order={order} difficulty="standard" />);
  expect(screen.getByAltText('Lạc 店员')).toHaveAttribute('src', expect.stringContaining('lac-cozy-happy-768.webp'));
  view.rerender(<Serving order={order} difficulty="rush" />);
  expect(screen.getByAltText('Dận 店员')).toHaveAttribute('src', expect.stringContaining('dan-cozy-768.webp'));
});

it('新手引导使用拿地图的新人物，告别时切换挥手立绘', () => {
  render(<CityScene onEnter={vi.fn()} />);
  expect(screen.getByAltText('拿着地图的新手引导员')).toHaveAttribute('src', expect.stringContaining('guide-cozy-640.webp'));
  for (let step = 0; step < 4; step++) fireEvent.click(screen.getByRole('dialog', { name: '新手教程' }));
  expect(screen.getByAltText('挥手告别的新手引导员')).toHaveAttribute('src', expect.stringContaining('guide-cozy-wave-640.webp'));
});

it.each([448, 768] as const)('手机与电脑 %s 尺寸各有四种不同表情动作', size => {
  const names = ['neutral', 'listening', 'happy', 'clarify'].map(mood => lacSpriteName(mood as 'neutral' | 'listening' | 'happy' | 'clarify', size));
  expect(new Set(names).size).toBe(4);
  expect(names.every(name => name.endsWith(`-${size}.webp`))).toBe(true);
  expect(lacSpriteName('impatient', size)).toBe(lacSpriteName('clarify', size));
  const danNames = ['neutral', 'listening', 'happy', 'impatient'].map(mood => danSpriteName(mood as 'neutral' | 'listening' | 'happy' | 'impatient', size));
  expect(new Set(danNames).size).toBe(4);
  expect(danNames.every(name => name.startsWith('dan-cozy') && !names.includes(name))).toBe(true);
  expect(danSpriteName('clarify', size)).toBe(danSpriteName('impatient', size));
});
