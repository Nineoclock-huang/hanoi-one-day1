import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {Serving} from './App';
import type {OrderTarget} from './engine';

afterEach(cleanup);
const base:OrderTarget={product:'milk-iced',quantity:1,sugar:'less',service:'here'};

it.each(['milk-iced','black-iced','bac-xiu','egg'] as const)('为 %s 绘制对应咖啡杯',product=>{
  const {container}=render(<Serving order={{...base,product}} difficulty="standard"/>);
  expect(screen.getByRole('status')).toHaveClass(`drink-${product}`);
  expect(container.querySelectorAll('.serving-cup')).toHaveLength(1);
});

it('两杯外带订单显示两只外带杯和 Dận',()=>{
  const {container}=render(<Serving order={{...base,product:'egg',quantity:2,service:'takeaway'}} difficulty="rush"/>);
  expect(screen.getByRole('status')).toHaveClass('drink-egg','serve-takeaway');
  expect(container.querySelectorAll('.serving-cup')).toHaveLength(2);
  expect(screen.getByAltText('Dận 店员')).toBeInTheDocument();
  expect(screen.getByText('咖啡备好了。')).toBeInTheDocument();
});
