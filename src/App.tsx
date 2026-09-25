import { FormEvent, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Check, Coffee, Lightbulb, RotateCcw, Sparkles, Timer, X } from 'lucide-react';
import CityScene from './CityScene';
import MarketScene from './MarketScene';
import { asset, loadCity, warmCafe } from './loading';
import { type AiFeedback, type ClerkMood, fallbackLanguageFeedback, isAiConfigured, requestAiFeedback, requestAiReply, trustedAiAttempts, warmAi } from './ai';
import { analyzeAttempts, analyzeContextualConfirmation, type Assessment, clerkReply, correctCriteria, type Criteria, criterionLabels, currentOrderTarget, emptyAssessment, finalScore, hints, mergeAssessment, normalizeVietnamese, orderSummary, randomizeOrderTarget, recommendedExpression, resolvedCount, resolvedCriteria, spokenOrder, type OrderTarget } from './engine';
import { keyboardIsOpen } from './mobileViewport';
import { cafeKnowledgeCheckedAt, cafeLearningTips } from './knowledge';
import { averageResponseTime, formatCountdown, RUSH_QUESTION_LIMIT_MS, rushPenalty } from './rush';

type Screen = 'home' | 'map' | 'mission' | 'chat' | 'serving' | 'grading' | 'report' | 'cafe-choice' | 'market';
type Difficulty = 'standard' | 'rush';
type CharacterMood = ClerkMood | 'impatient';
type ChatMessage = { role: 'clerk' | 'user'; vi: string; zh?: string };
type RushStats = { timeouts: number; responseTimes: number[] };
type SavedReport = { score: number; objectiveScore: number; completedAt: string; expressions: string[]; criteria: Criteria; assessment: Assessment; target?: typeof currentOrderTarget; hints: number; feedback: AiFeedback | null; feedbackUnavailable?: boolean; difficulty: Difficulty; timeouts: number; responseTimes: number[]; timePenalty: number };

const STORAGE_KEY = 'hanoi-one-day-reports';
const RUSH_KEY = 'hanoi-one-day-rush-unlocked';
const RUSH_DONE_KEY = 'hanoi-one-day-rush-completed';
function rushWasCompleted(){return localStorage.getItem(RUSH_DONE_KEY)==='yes'||loadReports().some(report=>report.difficulty==='rush');}
const steps: Screen[] = ['home', 'map', 'mission', 'chat', 'report'];
const labels: Record<Screen, string> = { home: '首页', map: '城市地图', mission: '任务介绍', chat: '对话场景', serving: '咖啡已送达', grading: 'AI 评分', report: '任务报告', 'cafe-choice':'咖啡馆 · 任务选择', market:'同春市场' };
const sprite = (clerk: 'Lạc' | 'Dận', mood: CharacterMood, size: 448 | 768) => {
  if (clerk === 'Dận') return asset(`dan${mood === 'neutral' ? '' : mood === 'clarify' || mood === 'impatient' ? '-impatient' : `-${mood}`}-${size}.webp`);
  return asset(`clerk${mood === 'neutral' ? '' : mood === 'impatient' ? '-clarify' : `-${mood}`}-${size}.webp`);
};
function loadReports(): SavedReport[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [rushUnlocked, setRushUnlocked] = useState(() => localStorage.getItem(RUSH_KEY) === 'yes');
  const [rushCompleted,setRushCompleted]=useState(rushWasCompleted);
  const [cafeChanged, setCafeChanged] = useState(() => localStorage.getItem(RUSH_KEY) === 'yes'&&!rushWasCompleted());
  const [newlyUnlocked, setNewlyUnlocked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assessment, setAssessment] = useState<Assessment>({ ...emptyAssessment });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [report, setReport] = useState<SavedReport | null>(null);
  const [servedOrder, setServedOrder] = useState<OrderTarget>({...currentOrderTarget});
  const [reports, setReports] = useState<SavedReport[]>(loadReports);
  const navigationStep = screen === 'serving' || screen === 'grading' ? 4 : Math.max(0, steps.indexOf(screen));
  const viewportBaseline = useRef(Math.max(window.innerHeight, window.visualViewport?.height || 0));
  const greeting = (mode: Difficulty): ChatMessage => mode === 'rush' ? { role: 'clerk', vi: 'Chào bạn. Gọi món nhanh nhé, tôi đang rất bận.', zh: '你好。请快点单，我现在很忙。' } : { role: 'clerk', vi: 'Xin chào! Bạn muốn uống gì?', zh: '你好！你想喝什么？' };
  const resetMission = () => { warmCafe(difficulty==='rush'); setMessages([greeting(difficulty)]); setAssessment({ ...emptyAssessment }); setHintsUsed(0); setReport(null); setScreen('chat'); };

  useEffect(() => { const timer = window.setTimeout(() => { if (screen === 'home') void loadCity().catch(() => {}); if (screen === 'map' || screen === 'mission') { warmCafe(rushUnlocked); void warmAi(); } }, screen === 'home' ? 1200 : 300); return () => window.clearTimeout(timer); }, [screen, rushUnlocked]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => { const height = Math.round(viewport?.height || window.innerHeight); if (screen !== 'chat' || height > viewportBaseline.current) viewportBaseline.current = Math.max(viewportBaseline.current, height); document.documentElement.style.setProperty('--app-height', `${height}px`); document.body.classList.toggle('chat-viewport', screen === 'chat'); document.body.classList.toggle('keyboard-open', screen === 'chat' && keyboardIsOpen(viewportBaseline.current, height)); if (screen === 'chat' && window.scrollY) window.scrollTo(0, 0); };
    update(); viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update); window.addEventListener('resize', update);
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); window.removeEventListener('resize', update); document.body.classList.remove('chat-viewport', 'keyboard-open'); };
  }, [screen]);

  const back = () => setScreen(screen==='cafe-choice'||screen==='market'?'map':steps[Math.max(navigationStep - 1, 0)]);
  const chooseCafe = (mode:Difficulty) => { randomizeOrderTarget(); setDifficulty(mode); setCafeChanged(false); setScreen('mission'); };
  const enterCafe = () => { if(rushCompleted){setDifficulty('standard');setScreen('cafe-choice');}else chooseCafe(rushUnlocked?'rush':'standard'); };
  const finish = async (finalAssessment: Assessment, finalMessages: ChatMessage[], stats: RushStats) => {
    const timePenalty = difficulty === 'rush' ? rushPenalty(stats.timeouts) : 0;
    const objectiveScore = Math.max(0, Object.values(finalAssessment).filter(value => value === 'correct').length * 15 - hintsUsed * 2 - timePenalty);
    const base: SavedReport = { score: objectiveScore, objectiveScore, completedAt: new Date().toISOString(), expressions: finalMessages.filter(message => message.role === 'user').map(message => message.vi), criteria: correctCriteria(finalAssessment), assessment: finalAssessment, target:{...currentOrderTarget}, hints: hintsUsed, feedback: null, difficulty, timeouts: stats.timeouts, responseTimes: stats.responseTimes, timePenalty };
    setServedOrder(spokenOrder(base.expressions,currentOrderTarget));
    let feedbackReady=false;
    const feedbackPromise=requestAiFeedback({ messages: finalMessages, target: currentOrderTarget, assessment: finalAssessment, difficulty, responseTimes: stats.responseTimes, timeouts: stats.timeouts }).catch(()=>null).then(value=>{feedbackReady=true;return value});
    await new Promise(resolve=>window.setTimeout(resolve,300));
    setScreen('serving');
    await new Promise(resolve=>window.setTimeout(resolve,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?350:2000));
    if(!feedbackReady)setScreen('grading');
    const aiFeedback = await feedbackPromise;
    const feedback = aiFeedback || fallbackLanguageFeedback(finalMessages, finalAssessment);
    const result: SavedReport = { ...base, score: Math.max(0, finalScore(finalAssessment, feedback.languageScore, hintsUsed) - timePenalty), feedback, feedbackUnavailable: !aiFeedback };
    setReports(previous => { const updated = [result, ...previous].slice(0, 10); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); return updated; });
    setReport(result);
    if (difficulty === 'standard' && !rushUnlocked) { localStorage.setItem(RUSH_KEY, 'yes'); setRushUnlocked(true); setCafeChanged(true); setNewlyUnlocked(true); } else setNewlyUnlocked(false);
    if(difficulty==='rush'){localStorage.setItem(RUSH_DONE_KEY,'yes');setRushCompleted(true);setCafeChanged(false);}
    setScreen('report');
  };

  return <main className="app-shell"><header className="topbar"><button className="brand" onClick={() => setScreen('home')} aria-label="返回首页"><span className="brand-mark">河</span><span>河内的一天</span></button><div className="step-label">{String(navigationStep + 1).padStart(2, '0')} / 05 · {labels[screen]}</div></header><section key={screen} className={`screen screen-${screen}`}>
    {screen === 'home' && <Home onStart={() => setScreen('map')} latest={reports[0]} />}
    {screen === 'map' && <CityScene onEnter={enterCafe} onMarket={()=>setScreen('market')} rushUnlocked={rushUnlocked&&!rushCompleted} cafeChanged={cafeChanged} />}
    {screen === 'cafe-choice' && <div className="cafe-choice"><p className="eyebrow">CÀ PHÊ · 再次相见</p><h2>Lạc 回到了柜台。</h2><p>咖啡馆的故事已完成。今天想和谁练习？</p><div className="cafe-choice-options"><button onClick={()=>chooseCafe('standard')}><img src={sprite('Lạc','neutral',448)} alt="Lạc"/><span>主线 · 日常点单<strong>Lạc</strong><small>慢慢说，练习一张新订单</small></span></button><button onClick={()=>chooseCafe('rush')}><img src={sprite('Dận','neutral',448)} alt="Dận"/><span>支线 · 忙碌时段<strong>Dận</strong><small>再次挑战限时点单</small></span></button></div><button className="secondary-button" onClick={()=>setScreen('map')}>返回街区，探索同春市场</button></div>}
    {screen === 'market' && <MarketScene />}
    {screen === 'mission' && <Mission onStart={resetMission} difficulty={difficulty} />}
    {screen === 'chat' && <Chat messages={messages} setMessages={setMessages} assessment={assessment} setAssessment={setAssessment} hintsUsed={hintsUsed} setHintsUsed={setHintsUsed} onComplete={finish} difficulty={difficulty} />}
    {screen === 'serving' && <Serving order={servedOrder} difficulty={difficulty} />}
    {screen === 'grading' && <Grading difficulty={difficulty} />}
    {screen === 'report' && report && <Report report={report} newlyUnlocked={newlyUnlocked} onRetry={resetMission} onMap={() => setScreen('map')} />}
  </section>{screen !== 'home' && screen !== 'report' && screen !== 'grading' && screen !== 'serving' && <button className="back-button" onClick={back}><ArrowLeft size={18} /> 返回</button>}</main>;
}

function Home({ onStart, latest }: { onStart: () => void; latest?: SavedReport }) { return <div className="hero"><div className="hero-copy"><p className="eyebrow">VIETNAMESE · CITY PRACTICE</p><h1>河内的<br /><em>一天</em></h1><p className="subtitle">在一座虚拟城市中学习真实的越南语</p><div className="home-actions"><button className="primary-button" onClick={onStart}>{latest ? '继续探索' : '开始体验'} <ArrowRight size={20} /></button>{latest && <div className="last-score"><strong>{latest.score}</strong><span>上次任务得分</span></div>}</div></div><div className="street-card" aria-label="河内咖啡店氛围图形"><span className="sun" /><div className="awning"><span /><span /><span /><span /><span /></div><div className="shop-sign">CÀ PHÊ</div><div className="shop-window"><Coffee size={54} /></div><div className="street-line" /><div className="scooter">○━●</div><p>Phố cổ · Hà Nội</p></div></div>; }
function Mission({ onStart, difficulty }: { onStart: () => void; difficulty: Difficulty }) { const rush = difficulty === 'rush'; return <div className={`page-wrap narrow ${rush ? 'rush-mission' : ''}`}><p className="eyebrow">{rush ? '限时挑战 · DẬN · A2' : '任务 01 · 街角咖啡店 · A1'}</p><h2>{rush ? '店员似乎发生了变化。' : '这次，请点'}<br />{rush ? 'Dận 正在等你点单' : orderSummary()}</h2><div className="scenario-note"><strong>{rush ? '新的挑战规则' : '你的情境'}</strong><p>{rush ? `每个问题只有 ${RUSH_QUESTION_LIMIT_MS / 1000} 秒。倒计时精确到毫秒，超时扣 5 分，但不会自动判错，你仍可继续回答。` : '上午九点，你走进河内老城区的一家咖啡店。请用越南语完成这张随机订单。'}</p></div><div className="mission-card"><p>{rush ? 'Dận 的订单仍包含 5 个目标：' : '需要作答 5 个目标（每项只有一次评分机会）：'}</p><ul>{Object.values(criterionLabels).map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ul></div><p className="tip">{rush ? '思考要快，表达也要完整。AI 会保持店员身份并根据你的回答继续追问。' : '答错也能继续对话，但首次明确作答的结果会锁定。系统可以理解无声调、大小写和常见空格问题。'}</p><button className="primary-button" onClick={onStart}>{rush ? '接受限时挑战' : '进入咖啡店'} <ArrowRight size={20} /></button></div>; }
function Grading({ difficulty }: { difficulty: Difficulty }) { return <div className="grading-stage" role="status" aria-live="polite"><div className="grading-orbit"><span /><span /><span /><Sparkles size={32} /></div><p className="eyebrow">任务完成 · 正在整理学习报告</p><h2>AI 正在完成评分</h2><p>正在核对首次作答、越南语表达{difficulty === 'rush' ? '与限时表现' : ''}。总分确认后会自动打开报告。</p><div className="grading-progress"><i /></div><div className="grading-steps"><span>任务正确性</span><span>语言自然度</span><span>{difficulty === 'rush' ? '反应速度' : '学习建议'}</span></div></div>; }

export function Serving({order,difficulty}:{order:OrderTarget;difficulty:Difficulty}){
  const clerk=difficulty==='rush'?'Dận':'Lạc';
  const drinkNames:Record<OrderTarget['product'],string>={'milk-iced':'冰牛奶咖啡','black-iced':'冰黑咖啡','bac-xiu':'bạc xỉu','egg':'鸡蛋咖啡'};
  const cupNames:Record<OrderTarget['product'],string>={'milk-iced':'SỮA ĐÁ','black-iced':'ĐEN ĐÁ','bac-xiu':'BẠC XỈU','egg':'TRỨNG'};
  return <div className={`serving-scene drink-${order.product} serve-${order.service}`} role="status" aria-label={`${clerk} 正在端上${drinkNames[order.product]}`}>
    <div className="serving-room" aria-hidden="true" />
    <div className="serving-clerk"><picture><source media="(max-width:760px)" srcSet={sprite(clerk,difficulty==='rush'?'neutral':'happy',448)}/><img src={sprite(clerk,difficulty==='rush'?'neutral':'happy',768)} alt={`${clerk} 店员`}/></picture></div>
    <div className="serving-copy"><span>ORDER READY · PHỐ CỔ</span><h2>{order.service==='takeaway'?'咖啡备好了。':'咖啡上桌了。'}</h2><p>{clerk}：{difficulty==='rush'?'Của bạn đây.':'Cà phê của bạn đây. Chúc bạn một ngày vui nhé!'}</p><small>{orderSummary(order)}</small></div>
    <div className={`serving-tray ${order.quantity===2?'two-cups':''}`} aria-hidden="true"><div className="serving-cups">{Array.from({length:order.quantity},(_,index)=><div className="serving-cup" key={index}><i className="cup-straw"/><i className="cup-lid"/><i className="cup-foam"/><i className="cup-ice ice-one"/><i className="cup-ice ice-two"/><i className="cup-ice ice-three"/><i className="cup-sleeve">{cupNames[order.product]}</i><i className="cup-handle"/><i className="cup-saucer"/></div>)}</div><div className="tray-plate"/><div className="tray-shadow"/></div>
    <div className="serving-caption">{order.service==='takeaway'?'装杯 · 递到你手中':'装杯 · 放上托盘 · 送到桌边'}<span>正在整理学习报告</span></div>
  </div>;
}

function Chat({ messages, setMessages, assessment, setAssessment, hintsUsed, setHintsUsed, onComplete, difficulty }: { messages: ChatMessage[]; setMessages: Dispatch<SetStateAction<ChatMessage[]>>; assessment: Assessment; setAssessment: Dispatch<SetStateAction<Assessment>>; hintsUsed: number; setHintsUsed: Dispatch<SetStateAction<number>>; onComplete: (assessment: Assessment, messages: ChatMessage[], stats: RushStats) => void; difficulty: Difficulty }) {
  const rush = difficulty === 'rush', clerk = rush ? 'Dận' : 'Lạc';
  const [input, setInput] = useState(''), [isReacting, setIsReacting] = useState(false), [isSending, setIsSending] = useState(false), [clerkMood, setClerkMood] = useState<CharacterMood>('neutral'), [rushStarted, setRushStarted] = useState(!rush), [remainingMs, setRemainingMs] = useState(RUSH_QUESTION_LIMIT_MS), [timerEpoch, setTimerEpoch] = useState(0), [timeouts, setTimeouts] = useState(0), [responseTimes, setResponseTimes] = useState<number[]>([]), [questionExpired,setQuestionExpired]=useState(false);
  const messagesRef = useRef<HTMLDivElement>(null), latestMessageRef = useRef<HTMLDivElement>(null), timeoutHandled = useRef(false);
  const timerState = useRef({ assessment, messages, timeouts, responseTimes, onComplete });
  timerState.current = { assessment, messages, timeouts, responseTimes, onComplete };
  useEffect(() => { const list = messagesRef.current; list?.scrollTo?.({ top: list.scrollHeight, behavior: 'smooth' }); latestMessageRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [messages, isSending]);
  useEffect(() => {
    if (!rush || !rushStarted || isSending || questionExpired || resolvedCount(timerState.current.assessment) === 5) return;
    timeoutHandled.current = false;
    const deadline = performance.now() + RUSH_QUESTION_LIMIT_MS;
    setRemainingMs(RUSH_QUESTION_LIMIT_MS);
    const tick = () => {
      const remaining = Math.max(0, deadline - performance.now());
      setRemainingMs(remaining);
      if (remaining > 0 || timeoutHandled.current) return;
      timeoutHandled.current = true;
      window.clearInterval(interval);
      const state = timerState.current;
      const newTimeouts = state.timeouts + 1;
      const next = clerkReply(resolvedCriteria(state.assessment), state.messages.filter(message => message.role === 'user').map(message => message.vi), currentOrderTarget);
      const timeoutMessage: ChatMessage = { role: 'clerk', vi: `Bạn gọi món xong chưa? Nhanh lên giúp tôi, phía sau còn khách. ${next.vi}`, zh: `您点好了吗？请快一点，后面还有客人。${next.zh}` };
      const nextMessages = [...state.messages, timeoutMessage];
      setTimeouts(newTimeouts); setQuestionExpired(true); setMessages(nextMessages); setClerkMood('impatient'); setIsReacting(true);
      window.setTimeout(() => setIsReacting(false), 900);
    };
    const interval = window.setInterval(tick, 17);
    tick();
    return () => window.clearInterval(interval);
  }, [isSending, questionExpired, rush, rushStarted, timerEpoch, setMessages]);
  const progress = resolvedCount(assessment);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!input.trim() || isSending || !rushStarted) return;
    const newResponseTimes = rush ? [...responseTimes, Math.max(0, Math.round(RUSH_QUESTION_LIMIT_MS - remainingMs))] : responseTimes; if (rush) setResponseTimes(newResponseTimes);
    const userMessage: ChatMessage = { role: 'user', vi: input.trim() }, previousClerk=[...messages].reverse().find(message=>message.role==='clerk'), pendingMessages = [...messages, userMessage], allUserInputs = pendingMessages.filter(message => message.role === 'user').map(message => message.vi), directAttempts=analyzeAttempts(userMessage.vi,currentOrderTarget), contextualAttempts=analyzeContextualConfirmation(userMessage.vi,previousClerk,assessment,currentOrderTarget), ruleAssessment = mergeAssessment(assessment,{...contextualAttempts,...directAttempts}), resolved = resolvedCriteria(ruleAssessment), fallbackReply = clerkReply(resolved, allUserInputs, currentOrderTarget);
    setMessages(pendingMessages); setAssessment(ruleAssessment); setInput(''); setIsReacting(true); setIsSending(true); setClerkMood('listening');
    const aiReply = await requestAiReply({ messages: pendingMessages, target: currentOrderTarget, criteria: resolved, assessment: ruleAssessment, beforeAssessment: assessment, suggestedReply: fallbackReply, task: orderSummary(), clerk, difficulty }), verifiedAttempts=trustedAiAttempts(aiReply,userMessage.vi),finalAssessment = mergeAssessment(ruleAssessment, verifiedAttempts), nextPrompt = clerkReply(resolvedCriteria(finalAssessment), allUserInputs, currentOrderTarget), safeReply = aiReply || nextPrompt, nextMessages = [...pendingMessages, { role: 'clerk' as const, ...safeReply }], newResults = (Object.keys(finalAssessment) as (keyof Assessment)[]).filter(key => assessment[key] === 'pending' && finalAssessment[key] !== 'pending'), nextMood: CharacterMood = newResults.some(key => finalAssessment[key] === 'incorrect') ? (rush ? 'impatient' : 'clarify') : newResults.some(key => finalAssessment[key] === 'correct') ? 'happy' : aiReply?.mood || 'clarify';
    setAssessment(finalAssessment); setMessages(nextMessages); setClerkMood(nextMood); setIsSending(false); setQuestionExpired(false); setTimerEpoch(value => value + 1); window.setTimeout(() => setIsReacting(false), 720); if (resolvedCount(finalAssessment) === 5) onComplete(finalAssessment, nextMessages, { timeouts, responseTimes: newResponseTimes });
  };
  const urgent = rush && remainingMs <= 4000;
  return <div className={`cafe-scene dialogue-stage ${rush ? 'rush-mode' : ''}`}><div className="cafe-ambient" aria-hidden="true" />{rush && questionExpired && <div className="penalty-notice" role="status" aria-live="assertive"><Timer size={20} /><span><strong>反应超时</strong>本题扣除 5 分，你仍可继续回答</span></div>}<aside className="cafe-task" aria-label="当前任务"><div className="cafe-task-title"><span>{rush ? '限时挑战 · DẬN' : '今日任务 · 01'}</span><strong>{orderSummary()}</strong><div className="progress-compact"><span>{progress}/5</span><div className="progress"><i style={{ width: `${progress * 20}%` }} /></div></div></div>{rush && <div className={`rush-timer ${urgent ? 'is-urgent' : ''}`} aria-label="本题剩余时间"><Timer size={15} /><span>{formatCountdown(remainingMs)}</span><small>{questionExpired?'等待作答':'超时 -5'}</small></div>}<div className="task-chips">{(Object.keys(assessment) as (keyof Assessment)[]).map(key => <span className={assessment[key] === 'correct' ? 'done' : assessment[key] === 'incorrect' ? 'incorrect' : ''} key={key} aria-label={`${criterionLabels[key]}：${assessment[key] === 'correct' ? '正确' : assessment[key] === 'incorrect' ? '错误' : '未作答'}`}>{assessment[key] === 'correct' && <Check size={13} />}{assessment[key] === 'incorrect' && <X size={13} />}{criterionLabels[key]}</span>)}</div></aside>
    <aside className={`character-stage character-${rush ? 'dan' : 'lac'} mood-${clerkMood} ${isReacting ? 'reacting' : ''}`} aria-label={`咖啡店店员 ${clerk}`}><div className="character-glow" /><div className="mood-fx" aria-hidden="true"><i /><i /><i /><i /></div><div className="speech-status"><span /><strong>{isSending ? `${clerk} 正在理解你的话…` : rush ? `${clerk} 不喜欢等待` : `${clerk} 正在等你点单`}</strong></div><picture className="character-picture"><source media="(max-width: 760px)" srcSet={sprite(clerk, clerkMood, 448)} /><img src={sprite(clerk, clerkMood, 768)} loading="eager" decoding="sync" fetchPriority="high" draggable="false" alt={`二次元咖啡店店员 ${clerk}`} /></picture><div className="character-label"><strong>{clerk}</strong><span>店员 · Nhân viên</span></div></aside>
    <section className="conversation"><div className="conversation-head"><div><p className="eyebrow">街角咖啡店 · {isAiConfigured ? 'AI 对话' : '规则型对话'}</p><h2>和 {clerk} 对话</h2></div></div><div className="messages" ref={messagesRef} aria-live="polite">{messages.map((message, index) => <div className={`bubble ${message.role}`} key={`${message.role}-${index}`}><small>{message.role === 'clerk' ? `${clerk} · 店员` : '你'}</small>{message.vi}{message.zh && <span>{message.zh}</span>}</div>)}{isSending && <div className="bubble clerk thinking-bubble" role="status" aria-label={`${clerk} 正在思考`}><small>{clerk} · 店员</small><span className="thinking-content">正在思考<span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span></span></div>}<div ref={latestMessageRef} className="message-end" aria-hidden="true" /></div>{hintsUsed > 0 && <div className="hint-panel"><Lightbulb size={18} /><span>{hints[hintsUsed - 1]}</span></div>}<form className="composer" onSubmit={submit}><button type="button" className="hint-button" onClick={() => setHintsUsed(Math.min(hintsUsed + 1, hints.length))} disabled={hintsUsed >= hints.length}>提示 {hintsUsed}/3</button><input value={input} onChange={event => setInput(event.target.value)} aria-label="越南语输入" placeholder="例如：Cho tôi một ly cà phê sữa đá…" autoComplete="off" /><button className="send-button" type="submit" disabled={isSending || !rushStarted}>{isSending ? '回复中…' : '发送'}</button></form></section>
    {rush && !rushStarted && <div className="rush-arrival" role="dialog" aria-label="限时挑战说明"><div><span>NEW SHIFT · 新的店员</span><h3>店员似乎发生了变化。</h3><p>Dận 把订单本放在柜台上。他说话更直接，也没有太多耐心——每次回答都从 12 秒开始倒计时；超时只扣分，你仍然可以继续回答。</p><button onClick={() => { setRushStarted(true); setTimerEpoch(value => value + 1); }}>我准备好了 <ArrowRight size={17} /></button></div></div>}
  </div>;
}

function Report({ report, newlyUnlocked, onRetry, onMap }: { report: SavedReport; newlyUnlocked: boolean; onRetry: () => void; onMap: () => void }) {
  const nonStandard = report.expressions.filter(text => normalizeVietnamese(text) === text.toLowerCase().replace(/\s+/g, ' ').trim()), average = averageResponseTime(report.responseTimes);
  const learningTips=cafeLearningTips(report.target||currentOrderTarget,report.assessment);
  return <div className="report-page"><div className="report-heading"><div><p className="eyebrow">任务报告 · 已保存到本机</p><h2>{Object.values(report.assessment).every(value => value === 'correct') ? '任务完成，干得漂亮！' : '任务已结束，看看哪里还能进步。'}</h2><p className="lead">总分已包含任务正确性、语言评价{report.difficulty === 'rush' ? '和限时表现' : ''}。</p></div><div className="score-card score-ready"><strong>{report.score}</strong><span>/ 100</span><p>最终综合得分</p></div></div><div className="report-grid"><section className="report-panel"><h3>任务正确性 · {report.objectiveScore}/75</h3>{(Object.keys(report.assessment) as (keyof Assessment)[]).map(key => <div className="report-row" key={key}><span>{criterionLabels[key]}</span><strong>{report.assessment[key] === 'correct' ? '✓ 15 / 15' : '× 0 / 15'}</strong></div>)}{report.hints > 0 && <p className="deduction">使用 {report.hints} 次提示，扣除 {report.hints * 2} 分。</p>}{report.difficulty === 'rush' && <div className="rush-report"><h3>限时表现</h3><div className="report-row"><span>平均反应时间</span><strong>{(average / 1000).toFixed(2)} 秒</strong></div><div className="report-row"><span>超时次数</span><strong>{report.timeouts} 次</strong></div>{report.timePenalty > 0 && <p className="deduction">超时扣除 {report.timePenalty} 分；超时不会改变任务项目的对错。</p>}</div>}{Object.values(report.assessment).includes('incorrect') && <p className="deduction">有项目首次作答错误，综合分最高为 79；语言分不能抵消任务错误。</p>}<h3>语言表达 · {report.feedback ? `${report.feedback.languageScore}/25` : '未取得'}</h3><p>{report.feedbackUnavailable ? 'AI 评分连接异常，本次已自动生成基础语言评价，任务正确性不受影响。' : 'AI 辅助评分不改变上方首次答案的对错。'}</p></section><section className="report-panel"><h3>你的表达</h3>{report.expressions.map((text, index) => <p className="expression" key={index}>{text}</p>)}<h3>规范与建议</h3><p>{nonStandard.length > 0 ? '系统理解了你的无声调表达。正式书写时，请补全越南语声调符号。' : '你的表达包含了规范的越南语声调，继续保持。'}</p>{report.feedback && <><p><strong>语法：</strong>{report.feedback.grammar}</p><p><strong>词汇：</strong>{report.feedback.vocabulary}</p><p><strong>自然度：</strong>{report.feedback.naturalness}</p><h3>下一步练习</h3><ul>{report.feedback.advice.map((item, index) => <li key={index}>{item}</li>)}</ul></>}<div className="recommended"><small>推荐表达</small>{recommendedExpression}</div><div className="knowledge-tips"><h3>越南语表达库</h3><small>词语已对照越南本地资料 · 更新于 {cafeKnowledgeCheckedAt}</small>{learningTips.map(tip=><article key={tip.id}><strong>{tip.vi}</strong><span>{tip.zh}</span><p>{tip.note}</p>{tip.source&&<a href={tip.source.url} target="_blank" rel="noreferrer">查看词语来源：{tip.source.name}</a>}</article>)}</div></section></div><div className="report-actions"><div className="map-return-wrap">{newlyUnlocked && <div className="unlock-bubble"><Sparkles size={16} /><span><strong>新难度已解锁</strong>返回街区，看看咖啡馆的新变化</span></div>}<button className="secondary-button" onClick={onMap}>返回城市地图</button></div><button className="primary-button" onClick={onRetry}><RotateCcw size={18} /> 再练一次</button></div></div>;
}
