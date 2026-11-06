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

test('growth defaults to source-derived global context with same-category comparisons opt-in',async()=>{
 const s=fixture();
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const modal=document.querySelector('dialog[open]');const svg=modal.querySelector('.publication-full-plot svg');
  assert.equal(svg.querySelectorAll('[data-growth-row]').length,21);
  assert.equal(svg.querySelectorAll('[data-growth-series="neurotech"]').length,21);
  const data=selectPublicationCharts(parsePublicationSnapshot(s,fixtureOptions));
  const band=svg.querySelector('[data-science-context]');assert.ok(band,'Default is global science context');
  assert.equal(Number(band.dataset.low),data.scienceGrowth.low);assert.equal(Number(band.dataset.high),data.scienceGrowth.high);
  assert.equal(Number(svg.querySelector('[data-neurotech-average]').dataset.value),data.neurotechGrowth);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,0,'Alternatives are off by default');
  const alternatives=modal.querySelector('input[type="checkbox"]');assert.ok(alternatives);assert.equal(alternatives.checked,false);
  assert.match(alternatives.closest('label').textContent,/Show alternative comparisons \(9 available\)/);
  assert.match(modal.querySelector('[data-growth-legend]').textContent,/Neurotech.*All-science context.*All neurotech/);
  assert.match(modal.querySelector('.pc-methodology').textContent,/9 same-category comparisons available; 12 unavailable/);
  await click(alternatives);
  assert.equal(alternatives.checked,true);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,9);
  assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,12);
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
  assert.equal(preview.querySelectorAll('[data-growth-series="reference"]').length,0);
  assert.ok(preview.querySelector('[data-science-context]'));
  assert.equal(Number(preview.querySelector('[data-neurotech-average]').dataset.value),data.neurotechGrowth);
  await click(alternatives);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,0);
  assert.deepEqual(JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1])),download,'Display choices preserve source JSON');
 } finally {await cleanup();}
});

test('growth lollipops have horizontal zero-based stems and percentages attached to endpoints in both views',async()=>{
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  const modal=document.querySelector('dialog');
  const full=modal.querySelector('.publication-full-plot svg');
  const preview=document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg');
  assert.ok(Number(full.getAttribute('viewBox').split(' ')[2])<=760,'Remove the distant value column');
  for(const svg of [full,preview]) {
   assert.equal(svg.querySelectorAll('[data-growth-row]').length,21);
   const zero=Number(svg.querySelector('[data-growth-stem="neurotech"]').getAttribute('x1'));
   for(const row of svg.querySelectorAll('[data-growth-row]')) {
    const dot=row.querySelector('circle');const stem=row.querySelector('[data-growth-stem="neurotech"]');
    const label=row.querySelector('[data-growth-label="neurotech"]');assert.ok(stem);assert.ok(label);
    assert.equal(Number(stem.getAttribute('x1')),zero);
    assert.equal(stem.getAttribute('y1'),dot.getAttribute('cy'));assert.equal(stem.getAttribute('y2'),dot.getAttribute('cy'));
    assert.equal(stem.getAttribute('x2'),dot.getAttribute('cx'));
    assert.ok(Math.abs(Number(label.getAttribute('x'))-Number(dot.getAttribute('cx')))<=13,'Percent immediately beside dot');
    assert.equal(label.getAttribute('y'),dot.getAttribute('cy'));
    assert.match(label.textContent,/^\+[\d,.]+%$/);
   }
  }
  await click(modal.querySelector('[data-growth-alternatives]'));
  for(const row of full.querySelectorAll('[data-growth-row]')) {
   for(const stem of row.querySelectorAll('line'))assert.equal(stem.getAttribute('y1'),stem.getAttribute('y2'),'No tilted connector');
   const diamond=row.querySelector('[data-growth-series="reference"]');if(!diamond)continue;
   const stem=row.querySelector('[data-growth-stem="reference"]');const label=row.querySelector('[data-growth-label="reference"]');
   const [x,y]=diamond.getAttribute('d').split(' ').slice(1,3).map(Number);
   assert.ok(stem);assert.ok(label);
   assert.equal(Number(stem.getAttribute('x2')),x);assert.equal(Number(stem.getAttribute('y1')),y+6);
   assert.ok(Math.abs(Number(label.getAttribute('x'))-x)<=13);assert.equal(Number(label.getAttribute('y')),y+6);
  }
 } finally {await cleanup();}
});

test('growth has aligned sticky axes in both scrollers while full SVG retains its own export axis',async()=>{
 const {readFileSync}=await import('node:fs');
 const {buildChartImage}=await import('../src/lib/chart-export.ts');
 const s=fixture();const parsed=parsePublicationSnapshot(s,fixtureOptions);const data=selectPublicationCharts(parsed);
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const style=document.createElement('style');style.textContent=readFileSync(new URL('../src/components/publication-charts.css',import.meta.url),'utf8');document.head.append(style);
  for(const region of [document.querySelector('dialog .publication-plot-1'),document.querySelector('[data-publication-card="publication-growth"] .publication-preview')]) {
   const svg=region.querySelector('svg');const sticky=region.querySelector('[data-growth-sticky-axis]');assert.ok(sticky);
   assert.equal(sticky.getAttribute('aria-hidden'),'true');assert.ok(sticky.hasAttribute('data-export-exclude'));
   assert.equal(getComputedStyle(sticky).position,'sticky');assert.equal(getComputedStyle(sticky).bottom,'0px');
   assert.ok(parseFloat(sticky.style.marginTop)<0,'Sticky footer overlaps the native axis at scroll bottom instead of duplicating it');
   assert.equal(svg.parentElement,sticky.parentElement,'Share a horizontally scrollable coordinate canvas');
   assert.equal(svg.getAttribute('viewBox').split(' ')[2],sticky.querySelector('svg').getAttribute('viewBox').split(' ')[2]);
   const nativeAxis=svg.querySelector('[data-growth-axis]');assert.ok(nativeAxis,'Standalone SVG keeps its own axis');
   assert.deepEqual([...nativeAxis.querySelectorAll('[data-growth-tick]')].map(t=>[t.getAttribute('x'),t.textContent]),[...sticky.querySelectorAll('[data-growth-tick]')].map(t=>[t.getAttribute('x'),t.textContent]));
  }
  const svg=document.querySelector('dialog .publication-full-plot svg');
  const image=buildChartImage({svg,title:'Publication growth',anchor:'publication-growth',notes:publicationExportNotes(1,parsed,data)},'https://atlas.example/field-velocity');
  const exported=new window.DOMParser().parseFromString(image.svg,'image/svg+xml');
  assert.equal(exported.querySelector('parsererror'),null);
  assert.equal(exported.querySelectorAll('svg svg').length,1,'Export uses only the complete plot, not the sticky duplicate');
  assert.match(image.svg,/Growth, 2022–2025/);assert.match(image.svg,/Gray: all-science/);assert.match(image.svg,/Dashed: all neurotech/);
  assert.equal(exported.querySelectorAll('svg svg circle').length,21);
 } finally {await cleanup();}
});

test('growth viewport height reserves actual wrapped controls and responds to viewport resize',async()=>{
 let top=600;
 const cleanup=await mount(chart(fixture()),'#publication-growth',win=>{
  Object.defineProperty(win,'innerHeight',{value:844,configurable:true});
  const bounds=win.HTMLElement.prototype.getBoundingClientRect;
  win.HTMLElement.prototype.getBoundingClientRect=function(){return this.classList.contains('publication-plot-1')?{top,width:288,height:220,bottom:820,left:0,right:288}:bounds.call(this);};
 });
 try {
  await act(async()=>new Promise(resolve=>setTimeout(resolve,40)));
  const plot=document.querySelector('dialog .publication-plot-1');
  assert.equal(plot.style.getPropertyValue('--publication-growth-max-height'),'220px','844 - actual top 600 - 24px viewport reserve');
  top=700;
  await act(async()=>window.dispatchEvent(new window.Event('resize')));
  assert.equal(plot.style.getPropertyValue('--publication-growth-max-height'),'120px','Recalculate when header or controls wrap');
 } finally {await cleanup();}
});

test('growth source download reproduces global benchmark and total from preserved annual values',async()=>{
 const s=fixture();const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const modal=document.querySelector('dialog');
  const download=JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
  assert.deepEqual(download.tables.nt_yearly,s.tables.nt_yearly,'Include the actual plotted context source');
  const count=(year,series)=>download.tables.nt_yearly.rows.find(row=>row[0]===String(year)&&row[1]===series)[2];
  const base=count(2022,'Neurotech papers');const growth=series=>(count(2025,series)/base-1)*100;
  const svg=modal.querySelector('[data-growth-export]');
  assert.equal(Number(svg.querySelector('[data-neurotech-average]').dataset.value),growth('Neurotech papers'));
  const band=svg.querySelector('[data-science-context]');
  assert.equal(Number(band.dataset.low),growth('Science baseline, low'));
  assert.equal(Number(band.dataset.high),growth('Science baseline, high'));
  assert.equal(Object.keys(download.tables).length,8,'Seven growth tables plus context source');
  assert.deepEqual(download.matchedGrowth,s.matchedGrowth);assert.deepEqual(download.source,s.source);
 } finally {await cleanup();}
});

test('growth native export requests use square context and dashed aggregate legend markers',async()=>{
 const snapshots=[];const create=URL.createObjectURL;
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  // Capture the real SVG passed to the native raster boundary; no canvas is emulated.
  URL.createObjectURL=blob=>{snapshots.push(blob);return 'blob:publication-test';};
  const modal=document.querySelector('dialog');
  await click(modal.querySelector('[data-download-chart="publication-growth"]'));
  assert.equal(snapshots.length,1);
  const image=await snapshots[0].text();const exported=new window.DOMParser().parseFromString(image,'image/svg+xml');
  assert.ok([...exported.documentElement.children].some(n=>n.localName==='rect'&&n.getAttribute('width')==='12'&&n.getAttribute('height')==='12'),'Science context has a square legend marker');
  assert.ok([...exported.documentElement.children].some(n=>n.localName==='line'&&n.getAttribute('stroke-dasharray')==='7 3'),'All-neurotech legend is dashed');
  assert.doesNotMatch(image,/Same-category research · outlined diamond/);
  await click(modal.querySelector('[data-growth-alternatives]'));
  await click(modal.querySelector('[data-download-chart="publication-growth"]'));
  assert.match(await snapshots[1].text(),/Same-category research · outlined diamond/);
 } finally {URL.createObjectURL=create;await cleanup();}
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
  if(index===3){assert.match(image.svg,/Employment transitions are unverified/);assert.match(image.svg,/2016/);}
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
  assert.match(svg.textContent,/No 2022 base/);assert.match(document.querySelector('dialog .pc-methodology').textContent,/12 unavailable/);
 }finally{await cleanup();}
});

test('an absent matched feed honestly labels all 21 references unavailable',async()=>{
 const cleanup=await mount(chart(syntheticPublicationSnapshot()),'#publication-growth');
 try {
  const svg=document.querySelector('dialog .publication-full-plot svg');
  assert.match(document.querySelector('dialog .pc-methodology').textContent,/0 same-category comparisons available; 21 unavailable/);
  assert.equal(document.querySelector('dialog input[type="checkbox"]').disabled,true);
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"]').length,0);
 }finally{await cleanup();}
});

test('equal matched growth keeps both series marks visible instead of overpainting',async()=>{
 const s=fixture();const row=s.matchedGrowth.rows.find(r=>r.id==='asia');
 row.numeratorCounts={'2022':10,'2025':12};row.neuroGrowthPct=20;row.shares={'2022':.01,'2025':.01};row.relativeShareGrowthPct=0;row.growthGapPercentagePoints=0;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  await click(document.querySelector('dialog input[type="checkbox"]'));
  const mark=document.querySelector('dialog [data-growth-row="asia"]');
  const circleY=Number(mark.querySelector('circle').getAttribute('cy'));
  const diamondStartY=Number(mark.querySelector('path').getAttribute('d').split(' ')[2]);
  assert.ok(Math.abs(circleY-(diamondStartY+6))>=8,'Matched glyph centers remain vertically separated');
 }finally{await cleanup();}
});
