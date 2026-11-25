import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';
globalThis.React=React;
const data=JSON.parse(readFileSync(new URL('../src/data/funding-index.json',import.meta.url)));
test('source-corrected China financing notes and long literal evidence URLs wrap inside narrow company detail cards',async()=>{
 const cleanup=await mount(React.createElement(FundingIndexDashboard,{data}));
 try {
  await click(document.querySelector('[data-founding-year="xinsheng-shijie"]'));
  const chinaNote='Matrix Partners’ investor announcement on Sina describes nearly RMB 100m Seed financing led by 经纬创投. Waves reporting, also syndicated by Sina on June 18, names 星连资本, 燕缘创投 and 水木创投 as participants. RMB 100m is a near-amount comparison anchor. Federal Reserve rate: CNY 6.7686 per USD on June 18, 2026.';
  const note=[...document.querySelectorAll('[role="dialog"] p')].find(p=>p.textContent===chinaNote);
  assert.ok(note,'The current source-corrected China evidence note is rendered, not the superseded research note');
  assert.ok([...document.querySelectorAll('[role="dialog"] a')].some(a=>a.href==='https://finance.sina.com.cn/wm/2026-06-18/doc-inicvfcv5537233.shtml'),'the actual investor announcement is still linked');
  assert.match(document.querySelector('[role="dialog"]').textContent, /Sum of indexed financing amounts, including labeled commitments/);
  assert.doesNotMatch(document.querySelector('[role="dialog"]').textContent, /not a cash-receipts total/);
  assert.ok(note.classList.contains('[overflow-wrap:anywhere]'),'Source notes retain narrow-card wrapping');
  // Xinsheng's corrected note no longer embeds a URL. Exercise the same note
  // component with a real retained literal, not by restoring obsolete copy.
  await click(document.querySelector('[aria-label="Close detail panel"]'));
  await click(document.querySelector('[data-funding-company-identity="paradromics"]').closest('button'));
  const originalAnnouncement='https://www.prnewswire.com/news-releases/paradromics-raises-20mm-in-seed-funding-led-by-prime-movers-lab-to-advance-brain-computer-interfaces-301338989.html';
  const longNote=[...document.querySelectorAll('[role="dialog"] p')].find(p=>p.textContent.includes(originalAnnouncement));
  assert.ok(longNote,'A real retained original-announcement URL is rendered in the evidence note');
  assert.ok(longNote.classList.contains('[overflow-wrap:anywhere]'),'Long literal evidence URLs must wrap within the note, not force horizontal scrolling');
 }finally {await cleanup();}
});

test('qualified native amounts stay bounded and wrap inside narrow company financing cards', async () => {
 const disclosed = data.rounds.find(round => round.sourceUrl === 'https://m.10jqka.com.cn/20261028/c681199560.shtml');
 assert.ok(disclosed?.displayAmount, 'Use the actual source-qualified native amount');
 const original = structuredClone(data);
 const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
 try {
  await click(document.querySelector('[data-funding-company-identity="stairmed"]').closest('button'));
  const amount = [...document.querySelectorAll('[role="dialog"] article .shrink-0')].find(element => element.textContent === disclosed.displayAmount);
  assert.ok(amount, 'The complete qualified native amount is rendered');
  assert.ok(amount.classList.contains('max-w-full'), 'A nonshrinking amount must be capped at the financing card width');
  assert.ok(amount.classList.contains('[overflow-wrap:anywhere]'), 'Long native amounts retain every qualifier through wrapping');
  assert.deepEqual(data, original, 'Narrow presentation leaves source data unchanged');
 } finally { await cleanup(); }
});
