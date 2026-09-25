import {afterEach,expect,it,vi} from 'vitest';
import {requestAiFeedback} from './ai';
import {currentOrderTarget,emptyAssessment} from './engine';

const input={messages:[{role:'user' as const,vi:'Cho tôi một ly cà phê sữa đá.'}],target:currentOrderTarget,assessment:emptyAssessment};
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});

it('网络瞬断后自动重试，评分请求不使用 keepalive',async()=>{
  const fetchMock=vi.fn()
    .mockRejectedValueOnce(new TypeError('network'))
    .mockResolvedValueOnce({ok:true,json:async()=>({languageScore:21,grammar:'好',vocabulary:'好',naturalness:'好',advice:['继续']})});
  vi.stubGlobal('fetch',fetchMock);
  const result=await requestAiFeedback(input,'https://example.test');
  expect(result.feedback?.languageScore).toBe(21);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('keepalive');
});

it('请求被拒绝时不重复发送评分内容',async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:false,status:403});
  vi.stubGlobal('fetch',fetchMock);
  expect(await requestAiFeedback(input,'https://example.test')).toEqual({feedback:null,failure:'blocked'});
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('响应一直不返回时，两次有上限的等待后给出超时原因',async()=>{
  vi.useFakeTimers();
  const fetchMock=vi.fn(()=>new Promise(()=>{}));
  vi.stubGlobal('fetch',fetchMock);
  const result=requestAiFeedback(input,'https://example.test');
  await vi.advanceTimersByTimeAsync(14_200);
  expect(await result).toEqual({feedback:null,failure:'timeout'});
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
