import { useEffect, useRef, useState } from 'react';
import { Coffee, ArrowUpRight, Sun, LocateFixed, Landmark, LockKeyhole, X } from 'lucide-react';
import { CITY_PLACES, CITY_VIEWS, CITY_MAP_SOURCES, cityPlace, type CityViewId } from './cityData';
import type { CityHandle } from './cityRenderer';
import { asset, loadCity } from './loading';
import './city.css';

const GUIDE_KEY='hanoi-one-day-guide-seen';
const guideSteps=[
  {title:'欢迎来到河内',body:'这是一座可以探索的越南语练习城市。先看看老城区、还剑湖与河边的街道。'},
  {title:'寻找咖啡馆',body:'地图上的红色 CÀ PHÊ 标记可以进入。第一版先从咖啡店任务开始，其他地点会陆续开放。'},
  {title:'用越南语开口',body:'进入咖啡店后，像真实点单一样输入越南语。Lạc 会回应你；需要帮助时可以点“提示”。'},
  {title:'每次回答都算数',body:'商品、数量、糖量、堂食或带走、付款各有一次评分机会。答错仍能继续，结束后会得到学习报告。'},
  {title:'河内见，祝你玩得开心！',body:'教程就到这里。接下来没有固定路线——去看看城市、寻找地标，准备好时再走进咖啡店。现在，把河内交给你自由探索。'},
];

export default function CityScene({ onEnter }: { onEnter: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLButtonElement>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const controls = useRef<CityHandle | null>(null);
  const enter = useRef(onEnter);
  enter.current = onEnter;
  const [status, setStatus] = useState('loading');
  const [view,setView]=useState<CityViewId>(()=>window.innerWidth<=760?'old-quarter':'overview');
  const initialView=useRef(view);
  const [selected,setSelected]=useState<string|null>(null);
  const changeView=(id:CityViewId)=>{initialView.current=id;setView(id);setSelected(null);controls.current?.setView(id)};
  const selectPlace=(id:string)=>{const place=cityPlace(id);if(!place)return;initialView.current=place.district;setView(place.district);controls.current?.focusPlace(id);setSelected(id)};
  const [guideStep,setGuideStep]=useState(()=>localStorage.getItem(GUIDE_KEY)==='yes'?-1:0);
  const [guideLeaving,setGuideLeaving]=useState(false);
  const finishGuide=()=>{localStorage.setItem(GUIDE_KEY,'yes');setGuideLeaving(false);setGuideStep(-1)};
  const nextGuide=()=>{if(guideLeaving)return;if(guideStep>=guideSteps.length-1)setGuideLeaving(true);else setGuideStep(guideStep+1)};
  useEffect(()=>{if(!guideLeaving)return;const timer=window.setTimeout(finishGuide,820);return()=>window.clearTimeout(timer)},[guideLeaving]);
  useEffect(() => {
    let cancelled = false;
    let handle: CityHandle | undefined;
    loadCity().then(({ mountCity }) => {
      if (cancelled || !host.current || !pin.current) return;
      try {
        handle = mountCity(host.current, pin.current, () => enter.current(), () => setStatus('fallback'), {
          initialView:initialView.current,
          markers:[...markers.current].map(([id,element])=>({id,element})),
          onSelect:setSelected,
        });
        controls.current=handle;
        setStatus('ready');
      } catch { setStatus('fallback'); }
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; handle?.dispose(); controls.current=null; };
  }, []);
  return <div className="city-shell">
    <div className="city-heading"><div><p className="eyebrow">HÀ NỘI · A CITY OF LAKES & STORIES</p><h2>今天，从河内出发。</h2><p>从西湖到红河，探索老街、地标与新的城市生活。</p></div><span className="city-weather"><Sun size={19}/> 09:20 · 晴朗的早晨</span></div>
    <nav className="city-districts" aria-label="地图分区">{CITY_VIEWS.map(item=><button key={item.id} aria-pressed={view===item.id} onClick={()=>changeView(item.id)}>{item.label}</button>)}</nav>
    <div className="city-world">
      <div ref={host} className="city-canvas" role="img" aria-label="固定鸟瞰视角的河内立体城市，包含西湖、还剑湖、巴亭、老城区、红河与龙边街区"/>
      <div className="city-map-caption"><span>HANOI / CITY ATLAS</span><strong>{CITY_VIEWS.find(item=>item.id===view)?.label}</strong><small>参照真实方位 · 比例与街道经游戏化简化</small></div>
      <button ref={pin} hidden={status !== 'ready'} className="city-pin" onClick={onEnter} aria-label="街角咖啡店，进入任务"><Coffee size={18}/><span>CÀ PHÊ <small>点击进入</small></span><ArrowUpRight size={15}/></button>
      {CITY_PLACES.filter(place=>place.id!=='cafe').map(place=><button key={place.id} ref={element=>{if(element)markers.current.set(place.id,element);else markers.current.delete(place.id)}} hidden={status!=='ready'} className={`city-place-marker ${place.kind}`} aria-label={`了解${place.name}`} onClick={()=>selectPlace(place.id)}>{place.kind==='landmark'?<Landmark size={12}/>:<LockKeyhole size={11}/>}<span>{place.name}</span></button>)}
      {status !== 'ready' && <div className="city-fallback" role="status"><Coffee size={36}/><p>{status === 'loading' ? '正在铺开河内的街道…' : '当前设备无法显示 3D 城市。'}</p>{<button onClick={onEnter}>进入咖啡店 <ArrowUpRight size={17}/></button>}</div>}
      <div className="city-compass"><span>北 N</span><i>↑</i></div>
      <div className="city-map-tools">
        <select aria-label="查找景点或场景" value={selected||''} onChange={event=>selectPlace(event.target.value)}><option value="">寻找一个地点…</option>{CITY_PLACES.map(place=><option key={place.id} value={place.id}>{place.name}{place.status==='planned'?' · 即将开放':''}</option>)}</select>
        <div className="city-zoom"><button aria-label="重置地图视角" onClick={()=>changeView('overview')}><LocateFixed size={17}/></button></div>
      </div>
      <div className="city-legend"><span className="legend-dot"/> 咖啡任务 <span className="legend-muted"/> 城市地标 <small>固定高清镜头 · 点击上方分区切换视角</small></div>
      {selected&&guideStep<0&&<aside className="city-place-card" aria-label="地点介绍"><button className="city-place-close" aria-label="关闭地点介绍" onClick={()=>setSelected(null)}><X size={16}/></button><small>{cityPlace(selected).status==='planned'?'未来场景 · 即将开放':cityPlace(selected).status==='open'?'已开放 · 越南语任务':'河内地标'}</small><h3>{cityPlace(selected).name}</h3><em>{cityPlace(selected).vietnamese}</em><p>{cityPlace(selected).description}</p>{selected==='cafe'?<button className="city-enter" onClick={onEnter}>进入咖啡店 <ArrowUpRight size={15}/></button>:<span className="city-place-note">{cityPlace(selected).status==='planned'?'任务尚未开放，敬请期待':'点击地图上的咖啡店开始语言练习'}</span>}</aside>}
      {guideStep>=0&&<div className={`city-tutorial ${guideStep===guideSteps.length-1?'guide-goodbye':''} ${guideLeaving?'is-leaving':''}`} role="dialog" aria-label="新手教程" onClick={nextGuide} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();nextGuide()}}} tabIndex={0}>
        <div className="guide-card" key={guideStep}><span className="guide-kicker">城市引导 · {guideStep+1}/{guideSteps.length}</span><h3>{guideSteps[guideStep].title}</h3><p>{guideSteps[guideStep].body}</p><span className="guide-next">{guideStep===guideSteps.length-1?(guideLeaving?'正在进入城市…':'挥手告别，开始探索'):'点击屏幕继续'} <ArrowUpRight size={15}/></span></div>
        <picture style={{display:"contents"}}><source media="(max-width: 760px)" srcSet={asset(guideStep===guideSteps.length-1?'guide-wave-320.png':'guide-320.webp')}/><img className="guide-character" src={asset(guideStep===guideSteps.length-1?'guide-wave-640.png':'guide-640.webp')} decoding="async" alt={guideStep===guideSteps.length-1?'挥手告别的新手引导员':'拿着地图的新手引导员'}/></picture>
        {guideStep===guideSteps.length-1&&<div className="guide-farewell-fx" aria-hidden="true"><i/><i/><i/><i/><i/><span>Hẹn gặp lại!</span></div>}
        <button className="guide-skip" onClick={event=>{event.stopPropagation();finishGuide()}}>跳过引导</button>
      </div>}
    </div>
    {guideStep<0&&<button className="guide-replay" onClick={()=>{setGuideLeaving(false);setGuideStep(0)}}>重看引导</button>}
    <details className="city-map-sources"><summary>地图参考</summary>{CITY_MAP_SOURCES.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}<span>景点按真实相对方位布置；店铺、道路与建筑为教学场景的简化设计。</span></details>
  </div>;
}
