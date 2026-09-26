import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  STALLS, MARKET_KEY, MARKET_BUDGET, readMarket, newMarket, nextScenario,
  balance, money, marketTurn, buyMarket, marketComplete, marketOpening,
  marketHint, marketScore, marketAdvice, priceKnown, scenarioFor, type StallId,
} from './market';
import { requestMarketReply } from './ai';
import './market.css';

export default function MarketScene() {
  const [save, setSave] = useState(readMarket);
  const [active, setActive] = useState<StallId | null>(null);
  const [travelling, setTravelling] = useState<StallId | null>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  const [notice, setNotice] = useState('');
  const [intro, setIntro] = useState(() => readMarket().visited.length === 0);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const host = useRef<HTMLDivElement>(null);
  const pins = useRef(new Map<StallId, HTMLButtonElement>());
  const handle = useRef<ReturnType<typeof import('./marketRenderer')['mountMarket']> | null>(null);
  const alive = useRef(true);
  const travelLock = useRef(false);
  const requestLock = useRef(false);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    import('./marketRenderer').then(({ mountMarket }) => {
      if (cancelled || !host.current) return;
      try { handle.current = mountMarket(host.current, pins.current); setReady(true); }
      catch { setFallback(true); }
    }).catch(() => { if (!cancelled) setFallback(true); });
    return () => { cancelled = true; alive.current = false; handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(MARKET_KEY, JSON.stringify(save)); }
    catch { setNotice('本机存储空间不足，离开前请完成本轮采购。'); }
  }, [save]);
  useEffect(() => { log.current?.scrollTo?.({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [save, active, busy]);
  useEffect(() => {
    if (!active && !report) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const vp = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty('--market-height', `${vp?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty('--market-top', `${vp?.offsetTop || 0}px`);
    };
    update();
    vp?.addEventListener('resize', update);
    vp?.addEventListener('scroll', update);
    return () => {
      document.body.style.overflow = old;
      vp?.removeEventListener('resize', update);
      vp?.removeEventListener('scroll', update);
    };
  }, [active, report]);

  const visit = async (id: StallId) => {
    if (intro || travelLock.current || requestLock.current) return;
    travelLock.current = true;
    setTravelling(id);
    setNotice('');
    let ok = true;
    try { if (handle.current) ok = await handle.current.travelTo(id); } catch { ok = false; }
    if (!alive.current) return;
    travelLock.current = false;
    setTravelling(null);
    if (!ok) { setNotice('这条路暂时走不通，请再选一次摊位。'); return; }
    setSave(s => ({ ...s, visited: [...new Set([...s.visited, id])] }));
    setActive(id);
    setInput('');
    setHintLevel(0);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || !input.trim() || requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setNotice('');
    const id = active, result = marketTurn(save, id, input.trim());
    setSave(result.state);
    setInput('');
    const ai = await requestMarketReply({
      stall: id, messages: result.state.history[id].slice(0, -1).slice(-6),
      price: result.state.quotes[id], event: result.event, suggestedReply: result.reply,
    });
    if (!alive.current) return;
    if (ai) setSave(s => ({ ...s, history: { ...s.history, [id]: [...s.history[id].slice(0, -1), { role: 'clerk', ...ai, source: 'ai' }] } }));
    else setNotice('当前使用基础对话，仍可问价、议价和购买。');
    setBusy(false);
    requestLock.current = false;
  };
  const buy = () => {
    if (!active || busy) return;
    const next = buyMarket(save, active);
    if (next === save) {
      setNotice(!priceKnown(save, active) ? '先用越南语问价，弄清价格后再决定是否购买。' : balance(save) < save.quotes[active] ? '预算不够，先试试议价，或换个摊位。' : '这件商品已在购物袋里。');
      return;
    }
    setSave(next);
    setNotice('已放入购物袋。结算报告会回放你的购物表达。');
  };
  const revealHint = () => {
    if (hintLevel === 3) return;
    setHintLevel((hintLevel + 1) as 1 | 2 | 3);
    setSave(s => ({ ...s, skills: { ...s.skills, hints: s.skills.hints + 1 } }));
  };
  const restart = () => {
    requestLock.current = false;
    travelLock.current = false;
    setSave(newMarket(nextScenario(save.scenario)));
    setActive(null);
    setTravelling(null);
    setInput('');
    setBusy(false);
    setReport(false);
    setIntro(true);
    setHintLevel(0);
    setNotice('新一轮采购已开始，本局会遇到不同的小状况。');
  };
  const stall = STALLS.find(t => t.id === active);
  const score = marketScore(save);
  const scenario = scenarioFor(save);
  const lastExpression = STALLS.flatMap(t => save.history[t.id]).filter(line => line.role === 'user').at(-1)?.vi;

  return <div className="market-shell">
    <header className="market-heading"><div><p>CHỢ ĐỒNG XUÂN / 10:30</p><h2>把河内，装进购物袋。</h2><span>自由逛摊 · 问价比较 · 越南语议价</span></div><div className="market-wallet"><small>剩余预算</small><strong>{money(balance(save))}</strong></div></header>
    <div className="market-objective"><span>采购委托</span><b className={save.purchases.fruit !== undefined ? 'bought' : ''}>① 两公斤芒果</b><b className={save.purchases.gifts !== undefined ? 'bought' : ''}>② 一盒伴手礼</b><b className={save.bargains.some(id => save.purchases[id] !== undefined) ? 'bought' : ''}>③ 议价后成交一次</b><small className={save.skills.scenarioSolved ? 'market-clue-solved' : ''}>{save.skills.scenarioSolved ? '✦ 本局线索已解开' : '✦ 留意本局的小状况'}</small></div>
    <div className="market-world">
      <div ref={host} className="market-canvas" role="img" aria-label="同春市场立体沙盘：三个特色摊位由中央步行通道连接，小旅人可在摊位间移动" />
      <div className="market-map-title"><strong>ĐỒNG XUÂN</strong><span>市场内街 / 点击摊位出发</span></div>
      {STALLS.map(t => <button key={t.id} ref={el => { if (el) pins.current.set(t.id, el); else pins.current.delete(t.id); }} hidden={!ready} className={`market-pin ${save.purchases[t.id] !== undefined ? 'is-bought' : ''}`} disabled={!!travelling || intro} onClick={() => void visit(t.id)} aria-label={`前往${t.name}`}><span>{t.icon}</span><strong>{t.name}<small>{t.vi} {save.purchases[t.id] !== undefined ? '· 已购' : '↗'}</small></strong></button>)}
      {!ready && <div className="market-fallback">{fallback ? '当前设备使用简易地图，采购功能仍可体验。' : '正在摆好摊位…'}{fallback && !intro && STALLS.map(t => <button key={t.id} onClick={() => void visit(t.id)}>{t.icon} {t.name}</button>)}</div>}
      {intro && <div className="market-intro"><div className="market-intro-card"><small>MARKET MISSION / 采购委托</small><h3>先逛、再问、最后决定。</h3><p>带着 {money(MARKET_BUDGET)} 买两公斤芒果和一盒伴手礼；试着用越南语问价，并完成一次礼貌议价。</p><p>每局有一个小状况。听听摊主怎么说，不用担心答错；需要时可逐级打开提示。</p><button onClick={() => setIntro(false)}>走进市场 ↗</button></div></div>}
      {travelling && <div className="market-travelling" role="status">小旅人正在前往 {STALLS.find(t => t.id === travelling)?.name}…</div>}
      <div className="market-map-note">入口 → 中央通道 → 摊位 · 北 N ↑</div>
    </div>
    <footer className="market-bag"><div><strong>🛍 购物袋 · {Object.keys(save.purchases).length} 件</strong><span>{Object.keys(save.purchases).length ? STALLS.filter(t => save.purchases[t.id] !== undefined).map(t => t.item).join(' / ') : `带着 ${money(MARKET_BUDGET)} 出发，先问问价格吧。`}</span></div><div className="market-bag-actions"><button className="market-restart" onClick={restart}>↻ 一键重来</button><button onClick={() => setReport(true)}>{marketComplete(save) ? '完成采购，查看报告' : '查看采购进度'}</button></div></footer>
    {stall && active && createPortal(<div className="market-overlay"><section className="market-dialog" role="dialog" aria-modal="true" aria-label={stall.name}>
      <header><div><small>{stall.vi}</small><h3>{stall.icon} {stall.name}</h3><p>{stall.vendor} · {stall.personality}</p></div><button disabled={busy} onClick={() => setActive(null)} aria-label="回到市场沙盘">✕</button></header>
      <div className="market-quote"><span>{stall.item}{scenario.stall === active && <small className="market-scene-tag">本局小状况 · {scenario.label}</small>}</span><strong>{priceKnown(save, active) ? money(save.quotes[active]) : '待询价'}<small>{priceKnown(save, active) ? '整份总价' : '用越南语问摊主'}</small></strong></div>
      <div className="market-messages" ref={log} aria-live="polite"><div className="market-message clerk"><small>{stall.vendor}<em className="message-source source-local">该句由本地生成</em></small>{marketOpening(save, active).vi}<span>{marketOpening(save, active).zh}</span></div>{save.history[active].slice(0, busy ? -1 : undefined).map((message, i) => <div className={`market-message ${message.role}`} key={i}><small>{message.role === 'user' ? '你' : stall.vendor}{message.role === 'clerk' && <em className={`message-source source-${message.source || 'unknown'}`}>{message.source === 'ai' ? 'AI 生成' : message.source === 'local' ? '该句由本地生成' : '来源未记录'}</em>}</small>{message.vi}{message.zh && <span>{message.zh}</span>}</div>)}{busy && <div className="market-message clerk">摊主正在回应<span className="market-dots"> …</span></div>}</div>
      <div className="market-hint"><button type="button" onClick={revealHint} disabled={hintLevel === 3}>{hintLevel === 0 ? '需要一点提示？' : hintLevel === 3 ? '已展示完整示范' : '再给我一点提示'} · {hintLevel}/3</button>{hintLevel > 0 && <p>{marketHint(save, active, hintLevel as 1 | 2 | 3)}</p>}{hintLevel === 0 && <small>先自己试试；提示会从关键词逐步展开。</small>}</div>
      {notice && <p className="market-notice" role="status">{notice}</p>}
      <form onSubmit={submit} className="market-composer"><input aria-label="与摊主用越南语交流" placeholder="先问价格，或回应摊主的问题…" maxLength={320} value={input} onChange={event => setInput(event.target.value)} disabled={busy} /><button disabled={busy || !input.trim()}>发送</button></form>
      <button className="market-buy" onClick={buy} disabled={busy || save.purchases[active] !== undefined}>{save.purchases[active] !== undefined ? '✓ 已购买' : priceKnown(save, active) ? `确认购买 · ${money(save.quotes[active])}` : '先问价，再购买'}</button>
    </section></div>, document.body)}
    {report && createPortal(<div className="market-overlay"><section className="market-dialog market-report" role="dialog" aria-modal="true" aria-label="市场采购报告">
      <small>YOUR MARKET JOURNAL / 采购回放</small><h3>{marketComplete(save) ? '采购完成，满载而归。' : '采购进行中'}</h3><p>已探索 {save.visited.length}/3 个摊位 · 剩余 {money(balance(save))}</p>
      <div className="market-score"><strong>{score.total}<small>/ 100 · 当前练习表现</small></strong><div><span>任务完成 {score.task}/45</span><span>信息核对 {score.comprehension}/20</span><span>语言尝试 {score.expression}/20</span><span>市场策略 {score.strategy}/10</span><span>礼貌表达 {score.politeness}/5</span></div></div>
      {STALLS.map(t => <div className="market-receipt" key={t.id}><span>{t.icon} {t.item}</span><strong>{save.purchases[t.id] !== undefined ? money(save.purchases[t.id]!) : '未购买'}</strong></div>)}
      <p>已节省 {money(STALLS.reduce((sum, t) => sum + (save.purchases[t.id] !== undefined ? t.price - save.purchases[t.id]! : 0), 0))} · 已成交议价 {save.bargains.filter(id => save.purchases[id] !== undefined).length} 次 · 使用提示 {save.skills.hints} 次</p>
      <h4>这一局值得练习</h4><ul className="market-advice">{marketAdvice(save).map(item => <li key={item}>{item}</li>)}</ul>
      {lastExpression && <div className="market-review-line"><small>你的表达</small><blockquote>{lastExpression}</blockquote></div>}
      <p className="market-report-note">分数由购物记录和可核对的对话行为计算；AI 负责摊主的自然回应，暂不替代交易规则或声称人工水平认证。</p>
      <button className="market-buy" onClick={() => setReport(false)}>继续逛市场</button>{marketComplete(save) && <button onClick={restart}>开启不同的小状况</button>}
    </section></div>, document.body)}
    {!active && !report && notice && <p className="market-reset-notice" role="status">{notice}</p>}
  </div>;
}
