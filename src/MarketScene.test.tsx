import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import MarketScene from './MarketScene';
import {requestMarketReply} from './ai';
vi.mock('./marketRenderer',()=>({mountMarket:()=>{throw new Error('WebGL unavailable');}}));
vi.mock('./ai',()=>({requestMarketReply:vi.fn(async()=>null)}));
afterEach(()=>{cleanup();localStorage.clear();vi.mocked(requestMarketReply).mockReset();});
it('无 WebGL 也能进入摊位、议价、购买并保存预算',async()=>{
 render(<MarketScene/>);fireEvent.click(screen.getByRole('button',{name:/走进市场/}));fireEvent.click(await screen.findByRole('button',{name:/兰姨水果摊/}));
 const input=await screen.findByRole('textbox',{name:'与摊主用越南语交流'});fireEvent.change(input,{target:{value:'Bot con 95 nghin duoc khong?'}});fireEvent.click(screen.getByRole('button',{name:'发送'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:/确认购买/})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:/确认购买/}));expect(screen.getByText('145.000₫')).toBeInTheDocument();
 expect(screen.getAllByText('该句由本地生成')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'回到市场沙盘'}));expect(screen.getByText('🛍 购物袋 · 1 件')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/一键重来/}));expect(screen.getAllByText('240.000₫').length).toBeGreaterThan(0);expect(screen.getByText('🛍 购物袋 · 0 件')).toBeInTheDocument();
});
it('摊主 AI 回复与本地开场白分别标记来源',async()=>{
 vi.mocked(requestMarketReply).mockResolvedValueOnce({vi:'Mời bạn xem xoài nhé.',zh:'请看看芒果。'});
 render(<MarketScene/>);fireEvent.click(screen.getByRole('button',{name:/走进市场/}));fireEvent.click(await screen.findByRole('button',{name:/兰姨水果摊/}));
 const input=await screen.findByRole('textbox',{name:'与摊主用越南语交流'});
 fireEvent.change(input,{target:{value:'Bao nhiêu tiền?'}});fireEvent.click(screen.getByRole('button',{name:'发送'}));
 await waitFor(()=>expect(screen.getByText('Mời bạn xem xoài nhé.')).toBeInTheDocument());
 expect(screen.getByText('AI 生成')).toBeInTheDocument();
 expect(screen.getByText('该句由本地生成')).toBeInTheDocument();
});
it('问价前隐藏总价，逐级提示和采购回放可用',async()=>{
 render(<MarketScene/>);fireEvent.click(screen.getByRole('button',{name:/走进市场/}));fireEvent.click(await screen.findByRole('button',{name:/兰姨水果摊/}));
 expect(screen.getByText('待询价')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/先问价，再购买/}));expect(screen.getByText(/先用越南语问价/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/需要一点提示/}));expect(screen.getByText(/关键词：xoài/)).toBeInTheDocument();
 const input=screen.getByRole('textbox',{name:'与摊主用越南语交流'});
 fireEvent.change(input,{target:{value:'Cô ơi, xoài bao nhiêu tiền một cân ạ?'}});fireEvent.click(screen.getByRole('button',{name:'发送'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:/确认购买/})).toBeEnabled());
 expect(screen.getByText('110.000₫')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'回到市场沙盘'}));
 fireEvent.click(screen.getByRole('button',{name:'查看采购进度'}));
 expect(screen.getByRole('dialog',{name:'市场采购报告'})).toHaveTextContent('信息核对');
 expect(screen.getByRole('dialog',{name:'市场采购报告'})).toHaveTextContent('使用提示 1 次');
});
