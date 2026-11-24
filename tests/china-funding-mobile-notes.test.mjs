import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';
globalThis.React=React;
const data=JSON.parse(readFileSync(new URL('../src/data/funding-index.json',import.meta.url)));
test('long primary-source URLs in financing notes wrap inside narrow company detail cards',async()=>{
 const cleanup=await mount(React.createElement(FundingIndexDashboard,{data}));
 try {
  await click(document.querySelector('[data-founding-year="xinsheng-shijie"]'));
  const note=[...document.querySelectorAll('[role="dialog"] p')].find(p=>p.textContent.includes('https://mp.weixin.qq.com/s/c-8dgjlXQ1URUDzmNGm5Qg'));
  assert.ok(note,'The actual financing evidence note is rendered');
  assert.ok(note.classList.contains('[overflow-wrap:anywhere]'),'Long literal evidence URLs must wrap within the note, not force horizontal scrolling');
 }finally {await cleanup();}
});
