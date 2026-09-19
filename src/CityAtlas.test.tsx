import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CityScene from './CityScene';
import { CITY_PLACES, CITY_VIEWS, cityPlace, clampCityZoom } from './cityData';

const renderer=vi.hoisted(()=>({dispose:vi.fn(),setView:vi.fn(),focusPlace:vi.fn()}));
vi.mock('./cityRenderer',()=>({mountCity:()=>renderer}));
beforeEach(()=>localStorage.setItem('hanoi-one-day-guide-seen','yes'));
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks()});

it('固定镜头可切换城区和复位，不提供自由缩放',async()=>{
  render(<CityScene onEnter={vi.fn()}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'重置地图视角'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'西湖'}));
  expect(renderer.setView).toHaveBeenLastCalledWith('west-lake');
  expect(screen.getByRole('button',{name:'西湖'})).toHaveAttribute('aria-pressed','true');
  expect(screen.queryByRole('button',{name:'放大地图'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'重置地图视角'}));expect(renderer.setView).toHaveBeenLastCalledWith('overview');
});

it('可查找所有地标；规划场景不会误进入咖啡任务',async()=>{
  const onEnter=vi.fn();render(<CityScene onEnter={onEnter}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'重置地图视角'})).toBeEnabled());
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'literature'}});
  const card=screen.getByRole('complementary',{name:'地点介绍'});
  expect(within(card).getByText('Văn Miếu – Quốc Tử Giám')).toBeInTheDocument();
  expect(renderer.focusPlace).toHaveBeenLastCalledWith('literature');
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'market'}});
  expect(within(card).getByText('未来场景 · 即将开放')).toBeInTheDocument();
  expect(within(card).queryByRole('button',{name:/进入咖啡店/})).toBeNull();expect(onEnter).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'cafe'}});
  fireEvent.click(within(card).getByRole('button',{name:/进入咖啡店/}));expect(onEnter).toHaveBeenCalledOnce();
});

it('地点注册表没有重复 ID、失效分区或意外开放的任务',()=>{
  expect(new Set(CITY_PLACES.map(p=>p.id)).size).toBe(CITY_PLACES.length);
  expect(CITY_PLACES.every(p=>CITY_VIEWS.some(v=>v.id===p.district))).toBe(true);
  expect(CITY_PLACES.filter(p=>p.status==='open').map(p=>p.id)).toEqual(['cafe']);
  expect(cityPlace('west-lake').x).toBeLessThan(cityPlace('hoan-kiem').x);
  expect(cityPlace('west-lake').z).toBeLessThan(cityPlace('hoan-kiem').z);
  expect(cityPlace('market').z).toBeLessThan(cityPlace('hoan-kiem').z);
  expect(cityPlace('opera').x).toBeGreaterThan(cityPlace('hoan-kiem').x);
  expect(clampCityZoom(10)).toBe(2.2);expect(clampCityZoom(.01)).toBe(.75);
});
