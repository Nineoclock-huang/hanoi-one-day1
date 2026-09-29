import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import App from './App';
import {requestAiReply,trustedAiAttempts} from './ai';

vi.mock('./cityRenderer',()=>({mountCity:()=>{throw new Error('WebGL unavailable')}}));
vi.mock('./ai',()=>({isAiConfigured:true,requestAiReply:vi.fn(async()=>({vi:'Dạ, tôi đã nghe.',zh:'好的，我听到了。',attempts:{}})),requestAiFeedback:vi.fn(async()=>null),trustedAiAttempts:vi.fn(()=>({}))}));
beforeEach(()=>{vi.mocked(requestAiReply).mockReset().mockResolvedValue({vi:'Dạ, tôi đã nghe.',zh:'好的，我听到了。',attempts:{}});vi.spyOn(Math,'random').mockReturnValue(0);vi.stubGlobal('scrollTo',vi.fn());Element.prototype.scrollTo=vi.fn();Element.prototype.scrollIntoView=vi.fn()});
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();vi.mocked(trustedAiAttempts).mockReturnValue({})});

async function enterChat(){
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('当前设备无法显示'));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
}
async function say(vi:string){
  fireEvent.change(screen.getByRole('textbox'),{target:{value:vi}});
  fireEvent.click(screen.getByRole('button',{name:'发送'}));
  await waitFor(()=>expect(screen.queryByRole('status',{name:'Lạc 正在思考'})).not.toBeInTheDocument());
}

it('截图回归：无糖短答完成目标，带走后只问付款',async()=>{
  vi.mocked(requestAiReply)
    .mockResolvedValueOnce({vi:'Bạn muốn thêm đường không?',zh:'要加糖吗？'})
    .mockResolvedValueOnce({vi:'Không đường, rồi. Bạn uống ở đây hay mang đi?',zh:'不加糖，好的。堂食还是带走？'})
    .mockResolvedValueOnce({vi:'Mang đi. Bạn thanh toán bằng cách nào?',zh:'带走。如何付款？'});
  await enterChat();
  await say('một ly cà phê sữa đá');
  await say('Không');
  expect(screen.getByLabelText('无糖：正确')).toBeInTheDocument();
  await say('mang di');
  expect(screen.getByLabelText('带走：正确')).toBeInTheDocument();
  expect(vi.mocked(requestAiReply)).toHaveBeenCalledTimes(3);
  expect([...document.querySelectorAll('.bubble.clerk')].at(-1)).toHaveTextContent('thanh toán');
  expect(vi.mocked(requestAiReply).mock.calls.at(-1)?.[0].assessment.sugar).toBe('correct');
});

it('AI 刚识别出的信息先合并，再改写旧状态的重复提问',async()=>{
  vi.mocked(trustedAiAttempts).mockReturnValue({sugar:'correct'});
  vi.mocked(requestAiReply)
    .mockResolvedValueOnce({vi:'Không đường. Bạn muốn thêm đường không?',zh:'无糖。你要加糖吗？',attempts:{sugar:'correct'}})
    .mockResolvedValueOnce({vi:'Không đường. Bạn uống tại chỗ hay mang đi?',zh:'无糖。堂食还是带走？'});
  await enterChat();
  await say('một ly cà phê sữa đá, không bỏ chất tạo ngọt');
  expect(screen.getByLabelText('无糖：正确')).toBeInTheDocument();
  expect(screen.queryByText('Không đường. Bạn muốn thêm đường không?')).not.toBeInTheDocument();
  expect(screen.getByText('Không đường. Bạn uống tại chỗ hay mang đi?')).toBeInTheDocument();
  const repair=vi.mocked(requestAiReply).mock.calls[1][0];
  expect(repair.responseOnly).toBe(true);
  expect(repair.assessment.sugar).toBe('correct');
  expect(repair.suggestedReply.zh).toBe('堂食还是带走？');
});

it('重复提问的 AI 改写也失败时使用有明确来源的正确下一问',async()=>{
  vi.mocked(requestAiReply).mockResolvedValue({vi:'Rồi, một ly. Bạn muốn mấy ly?',zh:'好，一杯。要几杯？'});
  await enterChat();
  await say('một ly cà phê sữa đá không đường mang đi');
  expect(vi.mocked(requestAiReply)).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Rồi, một ly. Bạn muốn mấy ly?')).not.toBeInTheDocument();
  expect(screen.getByText('Bạn muốn thanh toán bằng cách nào?')).toBeInTheDocument();
  expect(screen.getAllByText('该句由本地生成')).toHaveLength(2);
});

it('改口后店员记录新糖量，首次答错仍保持打叉',async()=>{
  vi.mocked(requestAiReply).mockResolvedValue(null);
  await enterChat();
  await say('một ly cà phê sữa đá ít đường');
  expect(screen.getByLabelText('无糖：错误')).toBeInTheDocument();
  await say('đổi sang không đường');
  expect(screen.getByLabelText('无糖：错误')).toBeInTheDocument();
  const latest=vi.mocked(requestAiReply).mock.calls.at(-1)?.[0];
  expect(latest?.order?.sugar).toBe('none');
  expect(latest?.scoreAssessment?.sugar).toBe('incorrect');
  expect(latest?.assessment.sugar).toBe('correct');
});

it('等待 AI 时在聊天区显示思考气泡，并自动滚动到新回复',async()=>{
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('当前设备无法显示'));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  expect(screen.getByRole('complementary',{name:'当前任务'})).toHaveTextContent('今日任务');
  expect(screen.getByText('该句由本地生成')).toBeInTheDocument();
  expect(screen.getByRole('complementary',{name:'咖啡店店员 Lạc'})).toBeInTheDocument();
  expect(screen.getByRole('img',{name:'二次元咖啡店店员 Lạc'})).toHaveAttribute('loading','eager');
  expect(screen.getByRole('img',{name:'二次元咖啡店店员 Lạc'})).toHaveAttribute('decoding','sync');
  const before=(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length;
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cà phê'}});
  fireEvent.click(screen.getByRole('button',{name:'发送'}));
  expect(screen.getByRole('status',{name:'Lạc 正在思考'})).toBeInTheDocument();
  expect(screen.getByRole('complementary',{name:'咖啡店店员 Lạc'})).toHaveClass('mood-listening');
  expect(screen.getByRole('img',{name:'二次元咖啡店店员 Lạc'})).toHaveAttribute('src',expect.stringContaining('lac-cozy-listening-768.webp'));
  await waitFor(()=>expect(screen.getByText(/Dạ, tôi đã nghe/)).toBeInTheDocument());
  expect(screen.getByText('AI 生成')).toBeInTheDocument();
  expect(screen.getByRole('complementary',{name:'咖啡店店员 Lạc'})).toHaveClass('mood-clarify');
  expect(document.querySelector('.mood-fx > span')).not.toBeInTheDocument();
  expect(screen.getByRole('img',{name:'二次元咖啡店店员 Lạc'})).toHaveAttribute('src',expect.stringContaining('lac-cozy-clarify-768.webp'));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before);
  expect(document.querySelector('.cafe-scene .bubble.user')).toHaveTextContent('Cà phê');
});

it('AI 不可用时明确标记店员回复由本地生成',async()=>{
  vi.mocked(requestAiReply).mockResolvedValue(null);
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('当前设备无法显示'));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cà phê'}});
  fireEvent.click(screen.getByRole('button',{name:'发送'}));
  await waitFor(()=>expect(document.querySelectorAll('.bubble.clerk')).toHaveLength(2));
  expect(screen.getAllByText('该句由本地生成')).toHaveLength(2);
  expect(screen.queryByText('AI 生成')).not.toBeInTheDocument();
});

it('咖啡馆错序表达在对话内纠正并可从全局错题本查看',async()=>{
  vi.mocked(requestAiReply).mockResolvedValue(null);
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/开始体验/}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('当前设备无法显示'));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.click(screen.getByRole('button',{name:'进入咖啡店'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cho tôi ca phe da sua'}});
  fireEvent.click(screen.getByRole('button',{name:'发送'}));
  await waitFor(()=>expect(screen.getByText('ca phe da sua')).toHaveClass('learner-error'));
  fireEvent.click(screen.getByRole('button',{name:/错题本/}));
  expect(screen.getByRole('dialog',{name:'全局错题本'})).toHaveTextContent('Cho tôi cà phê sữa đá');
});
