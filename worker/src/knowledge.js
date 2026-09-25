import bundled from '../../knowledge/cafe.json' with {type:'json'};

const libraryUrl='https://nineoclock-huang.github.io/hanoi-one-day1/knowledge/cafe.json';
let current=bundled,nextRefresh=0,refreshing=null;
const allowedHosts=new Set(['info.thecoffeehouse.com','www.vietnam.travel']);
export function validKnowledge(value){
  if(value?.version!==1||!Array.isArray(value.sources)||!Array.isArray(value.terms)||!Array.isArray(value.examples)||value.sources.length>12||value.terms.length>40||value.examples.length>40)return false;
  const sourceIds=new Set();
  for(const source of value.sources){try{const url=new URL(source.url);if(url.protocol!=='https:'||!allowedHosts.has(url.hostname)||typeof source.id!=='string'||source.id.length>40||sourceIds.has(source.id))return false;sourceIds.add(source.id)}catch{return false}}
  const ids=new Set();
  for(const term of value.terms){if(typeof term.id!=='string'||ids.has(term.id)||!sourceIds.has(term.source)||typeof term.vi!=='string'||term.vi.length>70||typeof term.zh!=='string'||term.zh.length>70)return false;ids.add(term.id)}
  return value.examples.every(example=>typeof example.id==='string'&&typeof example.topic==='string'&&typeof example.vi==='string'&&example.vi.length<160&&typeof example.zh==='string'&&example.zh.length<160&&typeof example.note==='string'&&example.note.length<220&&Array.isArray(example.sources)&&example.sources.every(id=>sourceIds.has(id)));
}
export function cafeKnowledge(ctx){
  if(ctx?.waitUntil&&Date.now()>nextRefresh&&!refreshing){
    nextRefresh=Date.now()+30*60_000;
    refreshing=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);try{const response=await fetch(libraryUrl,{signal:controller.signal});if(!response.ok)return;const content=await response.text();if(content.length>45_000)return;const candidate=JSON.parse(content);if(validKnowledge(candidate))current=candidate;}catch{}finally{clearTimeout(timer);refreshing=null}})();
    ctx.waitUntil(refreshing);
  }
  return current;
}
export function knowledgeContext(library,target){
  const wanted=new Set([target?.product,target?.service==='takeaway'?'takeaway':'here','cash']);
  const terms=library.terms.filter(term=>wanted.has(term.id)).map(term=>`${term.vi} (${term.zh})`);
  const relevantIds=new Set([`order-${target?.product==='milk-iced'?'milk':target?.product==='black-iced'?'black':target?.product}`,target?.service==='takeaway'?'takeaway':'dine-in','cash']);
  if(target?.product==='milk-iced'&&target?.sugar==='less')relevantIds.add('less-sweet');
  const examples=library.examples.filter(example=>relevantIds.has(example.id)).slice(0,4).map(example=>`${example.vi} = ${example.zh}`);
  return `Source-checked Vietnamese terms: ${terms.join('; ')}. Teacher-composed, not verbatim source quotations: ${examples.join('; ')}. These are style guidance only; never change the locked task results or claim that a shop must offer an adjustment. If a milk coffee is requested less sweet, clarify that condensed milk affects sweetness.`;
}
