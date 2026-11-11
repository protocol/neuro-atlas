import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFile } from 'node:fs/promises';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount } from './modal-helpers.mjs';
globalThis.React=React;
const data=JSON.parse(await readFile(new URL('../src/data/funding-index.json',import.meta.url),'utf8'));
test('every financing hit target clears the regulatory lane without changing date or monetary area',async()=>{
 const cleanup=await mount(React.createElement(FundingIndexDashboard,{data}));
 try {
  let compared=0;
  for(const row of document.querySelectorAll('[data-funding-company]')){
   const badges=[...row.querySelectorAll('span[aria-label]')].filter(x=>/^(IDE|CE|FDA) —/.test(x.getAttribute('aria-label')));
   for(const target of row.querySelectorAll('[data-financing-target]'))for(const badge of badges){
    assert.ok(parseFloat(target.style.top)+parseFloat(target.style.height)+4<=parseFloat(badge.style.top),`${target.getAttribute('aria-label')} must clear ${badge.getAttribute('aria-label')}`);compared++;
   }
  }
  assert.ok(compared>0,'Actual indexed co-located financing/regulatory evidence exercised');
 }finally{await cleanup();}
});
