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
  expect(screen.getAllByText(/Bạn gọi món xong chưa/)).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('本题扣除 5 分，你仍可继续回答');
  expect(screen.getByLabelText('本题剩余时间')).toHaveTextContent('等待作答');
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getAllByText(/Bạn gọi món xong chưa/)).toHaveLength(1);
});
it('完成 Dận 支线后再次进入可选择两位店员，刷新后保留选择',async()=>{
 localStorage.setItem('hanoi-one-day-rush-unlocked','yes');vi.mocked(requestAiFeedback).mockResolvedValue(null);
 const app=render(<App/>);fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
 await waitFor(()=>expect(screen.getByText('当前设备无法显示 3D 城市。')).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));fireEvent.click(screen.getByRole('button',{name:'接受限时挑战'}));fireEvent.click(screen.getByRole('button',{name:/我准备好了/}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cho tôi một ly cà phê sữa đá ít đường mang đi. Tôi thanh toán bằng tiền mặt.'}});fireEvent.click(screen.getByRole('button',{name:'发送'}));
 await waitFor(()=>expect(screen.getByText('最终综合得分')).toBeInTheDocument());expect(localStorage.getItem('hanoi-one-day-rush-completed')).toBe('yes');
 fireEvent.click(screen.getByRole('button',{name:'返回城市地图'}));fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
 expect(screen.getByRole('heading',{name:'Lạc 回到了柜台。'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/主线 · 日常点单/}));expect(screen.getByRole('button',{name:'进入咖啡店'})).toBeInTheDocument();
 app.unmount();render(<App/>);fireEvent.click(screen.getByRole('button',{name:/继续探索/}));await waitFor(()=>expect(screen.getByText('当前设备无法显示 3D 城市。')).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));fireEvent.click(screen.getByRole('button',{name:/支线 · 忙碌时段/}));expect(screen.getByRole('button',{name:'接受限时挑战'})).toBeInTheDocument();
});
