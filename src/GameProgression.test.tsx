import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { requestAiFeedback, type AiFeedback } from './ai';

vi.mock('./cityRenderer', () => ({ mountCity: () => { throw new Error('WebGL unavailable'); } }));
vi.mock('./ai', () => ({
  isAiConfigured: true,
  requestAiReply: vi.fn(async () => null),
  requestAiFeedback: vi.fn(),
  trustedAiAttempts: vi.fn(() => ({})),
}));

beforeEach(() => {
  const values = [0, 0, .5, 0]; let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => values[index++ % values.length]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('等待 AI 评分完成后才展示总分，并解锁 Dận 限时挑战', async () => {
  let finishFeedback!: (value: AiFeedback | null) => void;
  vi.mocked(requestAiFeedback).mockReturnValue(new Promise(resolve => { finishFeedback = resolve; }));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /开始体验/ }));
  await waitFor(() => expect(screen.getByText('当前设备无法显示 3D 城市。')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '进入咖啡店' }));
  fireEvent.click(screen.getByRole('button', { name: '进入咖啡店' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Cho tôi một ly cà phê sữa đá, ít đường, mang đi.' } });
  fireEvent.click(screen.getByRole('button', { name: '发送' }));
  await waitFor(() => expect(screen.getByText('Bạn muốn thanh toán bằng cách nào?')).toBeInTheDocument());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Tôi thanh toán bằng tiền mặt.' } });
  fireEvent.click(screen.getByRole('button', { name: '发送' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('AI 正在完成评分'));
  expect(screen.queryByText('最终综合得分')).not.toBeInTheDocument();
  finishFeedback({ languageScore: 22, grammar: '语法准确', vocabulary: '词汇合适', naturalness: '表达自然', advice: ['继续练习'] });
  await waitFor(() => expect(screen.getByText('最终综合得分')).toBeInTheDocument());
  expect(screen.getByText('新难度已解锁')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '返回城市地图' }));
  expect(screen.getByText('咖啡馆似乎发生了一些变化…')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '进入咖啡店' }));
  expect(screen.getByRole('heading', { name: /Dận 正在等你点单/ })).toBeInTheDocument();
  expect(screen.getByText(/每个问题只有 12 秒/)).toBeInTheDocument();
});

it('Dận 超时只扣一次分，不自动判错或推进目标', async () => {
  localStorage.setItem('hanoi-one-day-rush-unlocked', 'yes');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /开始体验/ }));
  await waitFor(() => expect(screen.getByText('当前设备无法显示 3D 城市。')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: '进入咖啡店' }));
  fireEvent.click(screen.getByRole('button', { name: '接受限时挑战' }));
  expect(screen.getByRole('dialog', { name: '限时挑战说明' })).toBeInTheDocument();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
  fireEvent.click(screen.getByRole('button', { name: /我准备好了/ }));
  act(() => vi.advanceTimersByTime(12_020));
  expect(screen.getByLabelText('冰牛奶咖啡：未作答')).toBeInTheDocument();
  expect(screen.getByLabelText('一杯：未作答')).toBeInTheDocument();
  expect(screen.getAllByText(/Hết giờ rồi/)).toHaveLength(1);
  expect(screen.getByLabelText('本题剩余时间')).toHaveTextContent('已扣 5 分 · 仍可回答');
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getAllByText(/Hết giờ rồi/)).toHaveLength(1);
});
