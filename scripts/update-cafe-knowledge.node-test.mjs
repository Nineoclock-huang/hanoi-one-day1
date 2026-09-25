import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildCafeKnowledge} from './update-cafe-knowledge.mjs';

const catalog=JSON.parse(await readFile(new URL('../knowledge/cafe.catalog.json',import.meta.url),'utf8'));
test('bundled and published language libraries match',async()=>{
  const bundled=await readFile(new URL('../knowledge/cafe.json',import.meta.url),'utf8');
  const published=await readFile(new URL('../public/knowledge/cafe.json',import.meta.url),'utf8');
  assert.equal(bundled,published);
});
test('only source-observed terms enter the language library',async()=>{
  const pages={
    'tch-menu':'Cà Phê Sữa Đá Cà Phê Đen Đá Bạc Xỉu',
    'tch-service':'Mang đi Tại chỗ Tiền mặt ví điện tử',
    'vietnam-tourism':'Ca phe trung',
  };
  const fetchPage=async url=>({ok:true,text:async()=>pages[catalog.sources.find(source=>source.url===url).id]});
  const library=await buildCafeKnowledge(catalog,fetchPage);
  assert.equal(library.terms.length,8);
  assert.ok(library.examples.some(example=>example.id==='order-egg'));
  assert.ok(library.examples.every(example=>example.sources.every(id=>library.sources.some(source=>source.id===id))));
});
test('a source outage does not produce a new library',async()=>{
  await assert.rejects(buildCafeKnowledge(catalog,async()=>({ok:false,status:503})),/503/);
});
