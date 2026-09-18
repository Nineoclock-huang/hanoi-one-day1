import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import App from './App';

vi.mock('./cityRenderer',()=>({mountCity:()=>{throw new Error('WebGL unavailable')}}));
vi.mock('./ai',()=>({isAiConfigured:true,requestAiReply:vi.fn(async()=>({vi:'Dạ, tôi đã nghe.',zh:'好的，我听到了。',attempts:{}})),requestAiFeedback:vi.fn(async()=>null)}));
beforeEach(()=>{vi.spyOn(Math,'random').mockReturnValue(0);vi.stubGlobal('scrollTo',vi.fn());Element.prototype.scrollTo=vi.fn();Element.prototype.scrollIntoView=vi.fn()});
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals()});

it('等待 AI 时在聊天区显示思考气泡，并自动滚动到新回复',async()=>{
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('当前设备无法显示'));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  expect(screen.getByRole('complementary',{name:'当前任务'})).toHaveTextContent('今日任务');
  expect(screen.getByRole('complementary',{name:'咖啡店店员 Lạc'})).toBeInTheDocument();
  const before=(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length;
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cà phê'}});
  fireEvent.click(screen.getByRole('button',{name:'发送'}));
  expect(screen.getByRole('status',{name:'Lạc 正在思考'})).toBeInTheDocument();
  await waitFor(()=>expect(screen.getByText(/Dạ, tôi đã nghe/)).toBeInTheDocument());
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before);
  expect(document.querySelector('.cafe-scene .bubble.user')).toHaveTextContent('Cà phê');
});
