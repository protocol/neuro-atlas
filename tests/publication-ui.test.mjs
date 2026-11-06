import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { PublicationCharts, publicationExportNotes } from '../src/components/publication-charts.tsx';
import { parsePublicationSnapshot, selectPublicationCharts } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth, fixtureOptions } from './fixtures/publication-synthetic.mjs';
import { mount, click } from './modal-helpers.mjs';
globalThis.React=React;
const fixture=()=>({...syntheticPublicationSnapshot(),matchedGrowth:syntheticMatchedGrowth()});
const chart=s=>React.createElement(PublicationCharts,{snapshot:s,allowTestFixture:true});

test('growth pairs nine genuinely matched comparisons and keeps twelve unavailable references explicit',async()=>{
 const s=fixture();
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const modal=document.querySelector('dialog[open]');const svg=modal.querySelector('.publication-full-plot svg');
  assert.equal(svg.querySelectorAll('[data-growth-row]').length,21);
  assert.equal(svg.querySelectorAll('[data-growth-series="neurotech"]').length,21);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,9);
  assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,12);
  assert.equal(svg.querySelectorAll('[data-science-context],rect').length,0,'No universal science band on grouped growth');
  assert.match(modal.querySelector('[data-growth-legend]').textContent,/Neurotech.*Same-category research/);
  assert.doesNotMatch(modal.textContent,/Above science band|Within science band|Below science band|OpenAlex via Artio|authors as of|two-topic author snapshot/i);
  const asia=svg.querySelector('[data-growth-row="asia"]');
  await act(async()=>asia.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
  const readout=modal.querySelector('[data-publication-inspector]').textContent;
  for(const expected of ['10','15','1,000','1,200','OpenAlex work ID','P2','reference','+50%','+20%'])assert.ok(readout.includes(expected),expected);
  await act(async()=>svg.querySelector('[data-growth-row="early"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
  assert.match(modal.querySelector('[data-publication-inspector]').textContent,/author-fractional works.*reference unavailable/i);
  assert.match(modal.textContent,/US and Canada/);
  assert.match(modal.textContent,/Government agencies and research facilities/);
  const download=JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
  assert.equal(download.matchedGrowth.rows.length,21);
  assert.ok(download.audit.quarterlyFractionalOutput);
  const preview=document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg');
  assert.equal(preview.querySelectorAll('[data-growth-series="reference"]').length,9);
  assert.equal(preview.querySelectorAll('[data-reference-unavailable]').length,12);
 } finally {await cleanup();}
});

test('annual science band is context-only and optional when independently acquired',async()=>{
 const s=fixture();
 let cleanup=await mount(chart(s),'#publication-output');
 try {
  assert.equal(document.querySelectorAll('dialog [data-science-context]').length,2);
  assert.match(document.querySelector('dialog .publication-legend').textContent,/Global science context/);
  assert.match(document.querySelector('dialog').textContent,/2025-12-31/);
 }finally{await cleanup();}
 s.tables.nt_yearly.rows=s.tables.nt_yearly.rows.filter(r=>r[1]==='Neurotech papers');
 delete s.source.scienceBaseline;s.audit.baselineStatus='not-supplied';
 cleanup=await mount(chart(s),'#publication-output');
 try {
  assert.equal(document.querySelectorAll('dialog [data-science-context]').length,0);
  assert.equal(document.querySelectorAll('dialog polygon').length,0);
  assert.doesNotMatch(document.querySelector('dialog .publication-legend').textContent,/All research|science band/);
  assert.match(document.querySelector('dialog').textContent,/Global science context unavailable/);
 }finally{await cleanup();}
});

for(const [index,anchor] of ['publication-output','publication-growth','researcher-sectors','researcher-sector-changes'].entries())test(anchor+': stable link, real SVG inspection and source-qualified full-image export',async()=>{
 const {buildChartImage}=await import('../src/lib/chart-export.ts');
 const snapshot=fixture();const parsed=parsePublicationSnapshot(snapshot,fixtureOptions);
 const cleanup=await mount(chart(snapshot),'#'+anchor);
 try {
  const modal=document.querySelector('dialog[open]');assert.ok(modal);
  const inspector=modal.querySelector('[data-publication-inspector]');assert.equal(inspector.textContent,'');
  assert.deepEqual([...modal.querySelector('[data-chart-actions]').querySelectorAll('button')].map(b=>b.textContent),['Copy link','Copy chart','Download PNG']);
  const svg=modal.querySelector('.publication-full-plot svg');
  assert.equal(svg.querySelectorAll('[data-publication-mark]').length,[20,21,104,6][index]);
  const image=buildChartImage({svg,title:'Synthetic primary export',anchor,notes:publicationExportNotes(index,parsed,selectPublicationCharts(parsed))},'https://atlas.example/field-velocity?token=excluded');
  assert.match(image.svg,/2026-11-06/);assert.match(image.svg,/2025-12-31/);
  assert.doesNotMatch(image.svg,/token=excluded|Artio|bioRxiv|2026-10-14|Model synthetic/i);
  if(index===1){assert.match(image.svg,/OpenAlex work ID/);assert.match(image.svg,/N = P2 two-topic whole-work involvement/);assert.match(image.svg,/Asia: N \(P2\) 10/);assert.match(image.svg,/author-fractional works/);}
  if(index===3){assert.match(image.svg,/first and latest publication affiliations in different sectors/i);assert.match(image.svg,/2016/);}
  const first=svg.querySelector('[data-publication-mark][tabindex="0"]');
  await act(async()=>first.dispatchEvent(new window.MouseEvent('mouseover',{bubbles:true})));
  assert.equal(inspector.textContent,'','Stationary appearance does not preselect');
  await act(async()=>first.dispatchEvent(new window.FocusEvent('focusin',{bubbles:true})));
  assert.ok(inspector.textContent.length>0);
 }finally{await cleanup();}
});

test('four previews open existing stable modal anchors and retain exact waffle and sector unknowns',async()=>{
 const cleanup=await mount(chart(fixture()));
 try {
  const cards=[...document.querySelectorAll('[data-publication-card]')];assert.equal(cards.length,4);
  assert.equal(document.querySelectorAll('.publication-preview button[aria-haspopup="dialog"]').length,4);
  for(const card of cards)assert.ok(card.querySelector('svg [data-publication-mark]'));
  assert.equal(cards[2].querySelectorAll('svg [data-publication-mark]').length,100);
  assert.match(cards[2].textContent,/No listed affiliation: 14/);
  assert.match(cards[2].textContent,/Other institutions: 13/);
  await click(cards[2].querySelector('.pc-trigger'));
  assert.match(document.querySelector('dialog').textContent,/100 unique researchers/);
  assert.match(document.querySelector('dialog').textContent,/government, facility, healthcare, nonprofit, archive, funder/);
 }finally{await cleanup();}
});

test('zero bases and absent comparisons render explicit labels without nonfinite geometry',async()=>{
 const s=fixture();
 const row=s.matchedGrowth.rows.find(r=>r.id==='invasive');row.numeratorCounts={'2022':0,'2025':3};row.neuroGrowthPct=null;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const svg=document.querySelector('dialog .publication-full-plot svg');
  assert.doesNotMatch(svg.outerHTML,/NaN|Infinity/);
  const mark=svg.querySelector('[data-growth-row="invasive"]');assert.equal(mark.querySelectorAll('circle,path').length,0);
  assert.match(svg.textContent,/No 2022 base/);assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,12);
 }finally{await cleanup();}
});

test('an absent matched feed honestly labels all 21 references unavailable',async()=>{
 const cleanup=await mount(chart(syntheticPublicationSnapshot()),'#publication-growth');
 try {
  const svg=document.querySelector('dialog .publication-full-plot svg');
  assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,21);
  assert.match(svg.querySelector(':scope > title').textContent,/21 reference groups unavailable/);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,0);
 }finally{await cleanup();}
});

test('equal matched growth keeps both series marks visible instead of overpainting',async()=>{
 const s=fixture();const row=s.matchedGrowth.rows.find(r=>r.id==='asia');
 row.numeratorCounts={'2022':10,'2025':12};row.neuroGrowthPct=20;row.shares={'2022':.01,'2025':.01};row.relativeShareGrowthPct=0;row.growthGapPercentagePoints=0;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const mark=document.querySelector('dialog [data-growth-row="asia"]');
  const circleY=Number(mark.querySelector('circle').getAttribute('cy'));
  const diamondStartY=Number(mark.querySelector('path').getAttribute('d').split(' ')[2]);
  assert.ok(Math.abs(circleY-(diamondStartY+6))>=8,'Matched glyph centers remain vertically separated');
 }finally{await cleanup();}
});
