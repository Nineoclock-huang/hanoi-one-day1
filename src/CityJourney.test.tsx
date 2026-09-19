import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import CityScene from './CityScene';
const travel=vi.hoisted(()=>vi.fn());
vi.mock('./cityRenderer',()=>({mountCity:()=>({dispose:vi.fn(),setView:vi.fn(),focusPlace:vi.fn(),travelTo:travel})}));
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();vi.clearAllMocks()});
it('waits for arrival and transition before entering, ignoring duplicate clicks',async()=>{
 localStorage.setItem('hanoi-one-day-guide-seen','yes');let arrive!:(value:boolean)=>void;travel.mockReturnValue(new Promise<boolean>(resolve=>{arrive=resolve}));
 const enter=vi.fn();render(<CityScene onEnter={enter}/>);
 const button=await screen.findByRole('button',{name:'街角咖啡店，进入任务'});await waitFor(()=>expect(button).toBeVisible());
 vi.useFakeTimers();fireEvent.click(button);fireEvent.click(button);expect(travel).toHaveBeenCalledTimes(1);expect(enter).not.toHaveBeenCalled();
 await act(async()=>{arrive(true)});expect(enter).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(650));expect(enter).toHaveBeenCalledOnce();
});
