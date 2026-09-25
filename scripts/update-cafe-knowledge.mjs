import { readFile, writeFile } from 'node:fs/promises';

const catalogUrl=new URL('../knowledge/cafe.catalog.json',import.meta.url);
const outputUrl=new URL('../public/knowledge/cafe.json',import.meta.url);
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
function visibleText(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ')}
export async function buildCafeKnowledge(catalog,fetchPage=fetch){
  const sourceText=new Map();
  for(const source of catalog.sources){
    const url=new URL(source.url);
    if(url.protocol!=='https:'||!['info.thecoffeehouse.com','www.vietnam.travel'].includes(url.hostname))throw new Error(`Unapproved source: ${source.url}`);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetchPage(source.url,{signal:controller.signal,headers:{'User-Agent':'HanoiOneDayKnowledgeBot/1.0 (educational source verification)'}});if(!response.ok)throw new Error(`${response.status}`);const html=await response.text();if(html.length>2_000_000)throw new Error('Source too large');sourceText.set(source.id,normalize(visibleText(html)));}
    finally{clearTimeout(timer)}
  }
  const sources=catalog.sources.map(({id,name,url})=>({id,name,url}));
  const terms=catalog.terms.filter(term=>sourceText.get(term.source)?.includes(normalize(term.evidence))).map(({id,category,vi,zh,source})=>({id,category,vi,zh,source}));
  const known=new Set(terms.map(term=>term.id));
  const examples=catalog.examples.filter(example=>example.requires.every(id=>known.has(id))).map(({id,topic,vi,zh,note,requires})=>({id,topic,vi,zh,note,sources:[...new Set(requires.map(id=>terms.find(term=>term.id===id).source))]}));
  if(terms.length<7||examples.length<4)throw new Error('Not enough source-backed terms; keeping the previous library');
  return{version:1,checkedAt:new Date().toISOString().slice(0,10),sources,terms,examples};
}
if(process.argv[1]&&new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`).href===import.meta.url){
  try{const catalog=JSON.parse(await readFile(catalogUrl,'utf8')),result=await buildCafeKnowledge(catalog);await writeFile(outputUrl,JSON.stringify(result,null,2)+'\n');console.log(`Verified ${result.terms.length} terms and ${result.examples.length} teaching examples.`)}
  catch(error){console.error(error);process.exitCode=1}
}
