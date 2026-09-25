import library from '../public/knowledge/cafe.json';
import type {Assessment,OrderTarget} from './engine';

export function cafeLearningTips(target:OrderTarget,assessment:Assessment){
  const ids=[`order-${target.product==='milk-iced'?'milk':target.product==='black-iced'?'black':target.product}`];
  if(target.product==='milk-iced'&&target.sugar==='less')ids.push('less-sweet');
  ids.push(target.service==='takeaway'?'takeaway':'dine-in');
  if(assessment.payment!=='correct')ids.push('cash');
  return ids.slice(0,3).flatMap(id=>{
    const example=library.examples.find(item=>item.id===id);
    if(!example)return[];
    const source=library.sources.find(item=>item.id===example.sources[0]);
    return[{...example,source}];
  });
}

export const cafeKnowledgeCheckedAt=library.checkedAt;
