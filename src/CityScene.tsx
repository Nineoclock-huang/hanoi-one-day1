import { useEffect, useRef, useState } from 'react';
import { Coffee, ArrowUpRight, Sun } from 'lucide-react';
import './city.css';

export default function CityScene({ onEnter }: { onEnter: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLButtonElement>(null);
  const enter = useRef(onEnter);
  enter.current = onEnter;
  const [status, setStatus] = useState('loading');
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
    </div>
  </div>;
}
