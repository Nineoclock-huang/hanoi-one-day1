import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import CityScene from './CityScene';

vi.mock('./cityRenderer',()=>({mountCity:()=>{throw new Error('WebGL unavailable')}}));
afterEach(()=>{cleanup();localStorage.clear()});

it('首次进入地图可逐步阅读引导，完成后不重复弹出',async()=>{
  const onEnter=vi.fn();
  const view=render(<CityScene onEnter={onEnter}/>);
  await waitFor(()=>expect(screen.getByRole('dialog',{name:'新手教程'})).toBeInTheDocument());
  expect(screen.getByText('欢迎来到河内')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog',{name:'新手教程'}));
  expect(screen.getByText('寻找咖啡馆')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog',{name:'新手教程'}));
  expect(screen.getByText('用越南语开口')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog',{name:'新手教程'}));
  expect(screen.getByText('每次回答都算数')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog',{name:'新手教程'}));
  expect(screen.getByText('河内见，祝你玩得开心！')).toBeInTheDocument();
  expect(screen.getByRole('img',{name:'挥手告别的新手引导员'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog',{name:'新手教程'}));
  expect(screen.getByRole('dialog',{name:'新手教程'})).toHaveClass('is-leaving');
  await waitFor(()=>expect(screen.queryByRole('dialog',{name:'新手教程'})).not.toBeInTheDocument(),{timeout:1800});
  expect(localStorage.getItem('hanoi-one-day-guide-seen')).toBe('yes');
  view.unmount();
  render(<CityScene onEnter={onEnter}/>);
  expect(screen.queryByRole('dialog',{name:'新手教程'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'重看引导'}));
  expect(screen.getByText('欢迎来到河内')).toBeInTheDocument();
});

it('可以跳过教程',()=>{
  render(<CityScene onEnter={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'跳过引导'}));
  expect(screen.queryByRole('dialog',{name:'新手教程'})).not.toBeInTheDocument();
});
