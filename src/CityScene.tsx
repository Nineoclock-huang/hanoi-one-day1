import { useEffect, useRef, useState } from 'react';
import { Coffee, ArrowUpRight, Sun } from 'lucide-react';
import './city.css';

const GUIDE_KEY='hanoi-one-day-guide-seen';
const guideSteps=[
  {title:'欢迎来到河内',body:'这是一座可以探索的越南语练习城市。先看看老城区、还剑湖与河边的街道。'},
  {title:'寻找咖啡馆',body:'地图上的红色 CÀ PHÊ 标记可以进入。第一版先从咖啡店任务开始，其他地点会陆续开放。'},
  {title:'用越南语开口',body:'进入咖啡店后，像真实点单一样输入越南语。Lạc 会回应你；需要帮助时可以点“提示”。'},
  {title:'每次回答都算数',body:'商品、数量、糖量、堂食或带走、付款各有一次评分机会。答错仍能继续，结束后会得到学习报告。'},
];

export default function CityScene({ onEnter }: { onEnter: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLButtonElement>(null);
  const enter = useRef(onEnter);
  enter.current = onEnter;
  const [status, setStatus] = useState('loading');
  const [guideStep,setGuideStep]=useState(()=>localStorage.getItem(GUIDE_KEY)==='yes'?-1:0);
  const finishGuide=()=>{localStorage.setItem(GUIDE_KEY,'yes');setGuideStep(-1)};
  const nextGuide=()=>{if(guideStep>=guideSteps.length-1)finishGuide();else setGuideStep(guideStep+1)};
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import('./cityRenderer').then(({ mountCity }) => {
      if (cancelled || !host.current || !pin.current) return;
      try {
        dispose = mountCity(host.current, pin.current, () => enter.current(), () => setStatus('fallback'));
        setStatus('ready');
      } catch { setStatus('fallback'); }
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div className="city-shell">
    <div className="city-heading"><div><p className="eyebrow">HÀ NỘI · A LITTLE WORLD TO EXPLORE</p><h2>今天，从河内出发。</h2><p>沿着湖边散步，走进街角的咖啡香。</p></div><span className="city-weather"><Sun size={19}/> 09:20 · 晴朗的早晨</span></div>
    <div className="city-world">
      <div ref={host} className="city-canvas" role="img" aria-label="固定鸟瞰视角的河内立体城市，包含还剑湖、老城区、红河与周边街区"/>
      <div className="city-map-caption"><span>01 / EXPLORE</span><strong>河内 · 老城区与周边</strong><small>河内意象微缩地图 · 非精确地理复刻</small></div>
      <button ref={pin} hidden={status !== 'ready'} className="city-pin" onClick={onEnter} aria-label="街角咖啡店，进入任务"><Coffee size={18}/><span>CÀ PHÊ <small>点击进入</small></span><ArrowUpRight size={15}/></button>
      {status !== 'ready' && <div className="city-fallback" role="status"><Coffee size={36}/><p>{status === 'loading' ? '正在铺开河内的街道…' : '当前设备无法显示 3D 城市。'}</p>{status === 'fallback' && <button onClick={onEnter}>进入咖啡店 <ArrowUpRight size={17}/></button>}</div>}
      <div className="city-compass"><span>北 N</span><i>↑</i><small>固定鸟瞰视角</small></div>
      <div className="city-legend"><span className="legend-dot"/> 可探索的地点 <span className="legend-muted"/> 即将开放</div>
      {guideStep>=0&&<div className="city-tutorial" role="dialog" aria-label="新手教程" onClick={nextGuide} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();nextGuide()}}} tabIndex={0}>
        <div className="guide-card" key={guideStep}><span className="guide-kicker">城市引导 · {guideStep+1}/{guideSteps.length}</span><h3>{guideSteps[guideStep].title}</h3><p>{guideSteps[guideStep].body}</p><span className="guide-next">{guideStep===guideSteps.length-1?'开始探索':'点击屏幕继续'} <ArrowUpRight size={15}/></span></div>
        <img className="guide-character" src={`${import.meta.env.BASE_URL}hanoi-guide.png`} alt="拿着地图的新手引导员"/>
        <button className="guide-skip" onClick={event=>{event.stopPropagation();finishGuide()}}>跳过引导</button>
      </div>}
    </div>
    {guideStep<0&&<button className="guide-replay" onClick={()=>setGuideStep(0)}>重看引导</button>}
  </div>;
}
