import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import CorrectionView from './CorrectionView';
import { kindLabels, type Mistake } from './notebook';
import './notebook.css';

export default function NotebookPanel({ entries, onClose }: { entries: Mistake[]; onClose: () => void }) {
  const [scene, setScene] = useState<'all' | Mistake['scene']>('all');
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', escape); };
  }, [onClose]);
  const visible = entries.filter(entry => scene === 'all' || entry.scene === scene);
  return createPortal(<div className="notebook-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="notebook-panel" role="dialog" aria-modal="true" aria-label="全局错题本"><header><div><small>HỌC TỪ LỖI SAI · LEARNING JOURNAL</small><h2>我的错题本</h2><p>咖啡馆与同春市场的表达问题都保存在这台设备上。</p></div><button onClick={onClose} aria-label="关闭错题本">✕</button></header><nav aria-label="筛选关卡">{([['all','全部'],['cafe','咖啡馆'],['market','同春市场']] as const).map(([key,label])=><button key={key} className={scene===key?'selected':''} onClick={()=>setScene(key)}>{label}</button>)}</nav><div className="notebook-list">{visible.length===0?<div className="notebook-empty"><strong>这里暂时没有记录</strong><p>大胆开口吧。发现明确的表达错误后，会在对话中标出并自动收进这里。</p></div>:visible.map(entry=><article key={entry.id}><div className="notebook-meta"><span>{entry.scene==='cafe'?'咖啡馆':'同春市场'} · {kindLabels[entry.kind]}</span><small>{entry.source==='ai'?'AI 辅助判定':'基础规则判定'}{entry.count>1?` · 出现 ${entry.count} 次`:''}</small></div><blockquote><CorrectionView original={entry.original} correction={entry}/></blockquote></article>)}</div><footer>仅记录能够定位到原句的明确问题。AI 建议可能出错，建议结合上下文学习。</footer></section></div>, document.body);
}
