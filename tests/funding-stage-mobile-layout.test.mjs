import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import {FundingIndexDashboard} from '../src/components/funding-index-dashboard.tsx';
import {mount,click} from './modal-helpers.mjs';
globalThis.React=React;
const data=JSON.parse(readFileSync(new URL('../src/data/funding-index.json',import.meta.url)));
test('Stage cards constrain the mobile grid and wrap headers rather than widening the viewport',async()=>{
 const cleanup=await mount(React.createElement(FundingIndexDashboard,{data}));
 const root=document;
 try{
  await click([...root.querySelectorAll('button')].find(e=>e.textContent==='stage'));
  const articles=[...root.querySelectorAll('article')];
  assert.ok(articles.length>0);
  assert.match(articles[0].parentElement.className,/grid-cols-1/);
  for(const article of articles){
   assert.match(article.className,/min-w-0/);
   assert.match(article.firstElementChild.className,/grid-cols-\[minmax\(0,1fr\)_auto\]/);
  }
 }finally{await cleanup();}
});
