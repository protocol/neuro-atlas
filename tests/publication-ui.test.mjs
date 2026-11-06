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

const chooseBaseline=async(modal,value)=>act(async()=>{
 const select=modal.querySelector('[data-growth-baseline]');assert.ok(select,'Native comparison baseline selector');
 select.value=value;select.dispatchEvent(new window.Event('change',{bubbles:true}));
});

test('growth selects one baseline per group without a second numerator or silent fallback',async()=>{
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
  const original=svg.outerHTML;
  const select=modal.querySelector('select[data-growth-baseline]');assert.ok(select);assert.equal(select.value,'science');
  assert.match(select.closest('label').textContent,/Comparison baseline/);
  assert.deepEqual([...select.options].map(option=>option.textContent),['General science','Matched to each group (9 available)']);
  assert.equal(modal.querySelector('input[type="checkbox"]'),null,'Baseline selection replaces the overlay');
  assert.match(modal.querySelector('.pc-methodology').textContent,/9 same-category comparisons available; 12 unavailable/);
  await chooseBaseline(modal,'matched');
  assert.equal(svg.querySelector('[data-science-context]'),null,'There is no shared band for row-specific baselines');
  assert.equal(svg.querySelectorAll('[data-growth-reference-tick]').length,9);
  assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,12);
  assert.equal(svg.querySelectorAll('[data-growth-series="neurotech"]').length,21);
  assert.equal(svg.querySelectorAll('[data-growth-stem]').length,21,'One numerator, never parallel stems');
  assert.equal(svg.querySelectorAll('[data-growth-series="reference"] path, path[data-growth-series="reference"]').length,0);
  for(const row of data.growth) {
   const mark=svg.querySelector(`[data-growth-row="${row.id}"]`);
   assert.equal(mark.dataset.baselineStatus,row.referenceGrowth===null?'unavailable':'above');
   if(row.referenceGrowth===null)assert.equal(mark.querySelector('circle').getAttribute('fill'),'var(--surface)');
   else assert.equal(Number(mark.querySelector('[data-growth-reference-tick]').dataset.value),row.referenceGrowth);
  }
  assert.match(svg.querySelector('[data-growth-legend]').textContent,/Baseline unavailable/);
  assert.match(modal.querySelector('[data-growth-coverage]').textContent,/9.*12.*no.*fallback/i);
  assert.equal(Number(svg.querySelector('[data-neurotech-average]').dataset.value),data.neurotechGrowth);
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
  await chooseBaseline(modal,'science');
  assert.equal(svg.outerHTML,original,'Returning to General science restores the exact default SVG');
  assert.deepEqual(JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1])),download,'Display choices preserve source JSON');
 } finally {await cleanup();}
});

test('current snapshot keeps exact values, source-derived order and reference BCI count labels',async()=>{
 const {readFileSync}=await import('node:fs');
 const s=JSON.parse(readFileSync(new URL('../src/data/publications/publication-charts.snapshot.json',import.meta.url),'utf8'));
 const data=selectPublicationCharts(parsePublicationSnapshot(s));
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const modal=document.querySelector('dialog'),svg=modal.querySelector('[data-growth-export]');
  assert.deepEqual([...svg.querySelectorAll('[data-growth-row]')].map(mark=>[mark.dataset.growthRow,Number(mark.dataset.value)]),data.growth.map(row=>[row.id,row.growth]));
  assert.equal(svg.querySelectorAll('[data-baseline-status="above"]').length,19);assert.equal(svg.querySelectorAll('[data-baseline-status="below"]').length,2);
  assert.deepEqual([...svg.querySelectorAll('[data-growth-tick]')].map(tick=>tick.textContent),['0%','+50%','+100%','+150%']);
  const high=Math.ceil(Math.max(...data.growth.map(row=>row.growth),data.neurotechGrowth,data.scienceGrowth.high)/25)*25;assert.equal(high,175);
  for(const mark of svg.querySelectorAll('[data-growth-row]'))assert.equal(Number(mark.querySelector('circle').getAttribute('cx')),280+Number(mark.dataset.value)/high*460);
  for(const id of ['bci','not-bci']) {
   const row=data.growth.find(row=>row.id===id),count=row.end.toLocaleString('en-US',{maximumFractionDigits:1});
   const mark=svg.querySelector(`[data-growth-row="${id}"]`);
   assert.equal(mark.parentElement.querySelector('[data-growth-name]').textContent,`${row.group} (${count} papers)`);
   assert.match(document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg').textContent,new RegExp(`${count} papers`));
  }
  await chooseBaseline(modal,'matched');
  assert.equal(svg.querySelectorAll('[data-baseline-status="above"]').length,9);assert.equal(svg.querySelectorAll('[data-baseline-status="unavailable"]').length,12);
  assert.deepEqual([...svg.querySelectorAll('[data-growth-row]')].map(mark=>[mark.dataset.growthRow,Number(mark.dataset.value)]),data.growth.map(row=>[row.id,row.growth]));
 }finally{await cleanup();}
});

test('growth lollipops have horizontal zero-based stems and percentages attached to endpoints in both views',async()=>{
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  const modal=document.querySelector('dialog');
  const full=modal.querySelector('.publication-full-plot svg');
  const preview=document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg');
  assert.equal(Number(full.getAttribute('viewBox').split(' ')[2]),820,'Reference proportions reserve room for right-aligned labels and endpoint percentages');
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
  await chooseBaseline(modal,'matched');
  for(const row of full.querySelectorAll('[data-growth-row]')) {
   const stem=row.querySelector('[data-growth-stem]');assert.equal(stem.getAttribute('y1'),stem.getAttribute('y2'),'No tilted connector');
   const tick=row.querySelector('[data-growth-reference-tick]');if(!tick)continue;
   assert.equal(tick.getAttribute('x1'),tick.getAttribute('x2'),'Baseline is a local vertical tick, not a parallel lollipop');
   const cy=Number(row.querySelector('circle').getAttribute('cy'));
   assert.ok(Number(tick.getAttribute('y1'))<cy&&Number(tick.getAttribute('y2'))>cy);
  }
 } finally {await cleanup();}
});

test('growth follows reference colors, section geometry, direct benchmark annotations and bottom dot legend',async()=>{
 const s=fixture();
 for(const [id,end] of [['invasive',110],['high',100]]) {
  const row=s.matchedGrowth.rows.find(row=>row.id===id);row.numeratorCounts['2025']=end;row.neuroGrowthPct=(end/100-1)*100;
 }
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  for(const svg of [document.querySelector('dialog [data-growth-export]'),document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg')]) {
   const legend=svg.querySelector('[data-growth-legend]');assert.ok(legend);
   assert.deepEqual([...legend.querySelectorAll('text')].map(text=>text.textContent),svg.hasAttribute('data-growth-export')?['Above baseline','Within','Below']:['Above','Within','Below']);
   const colors={above:'#4b4df2',within:'#98a2b3',below:'#e8a132'};
   for(const [id,status] of [['eeg','above'],['invasive','within'],['high','below']]) {
    const mark=svg.querySelector(`[data-growth-row="${id}"]`);assert.equal(mark.dataset.baselineStatus,status);
    assert.equal(mark.querySelector('circle').getAttribute('fill'),colors[status]);
    assert.equal(mark.querySelector('[data-growth-stem]').getAttribute('stroke'),colors[status]);
    assert.equal(legend.querySelector(`[data-growth-legend-swatch="${status}"]`).getAttribute('fill'),colors[status]);
   }
   const science=svg.querySelector('[data-growth-science-label]');assert.equal(science.textContent,'Science baseline');
   const band=svg.querySelector('[data-science-context]');
   assert.equal(Number(science.getAttribute('x')),Number(band.getAttribute('x'))+Number(band.getAttribute('width'))/2);
   assert.ok(Number(science.getAttribute('y'))<Number(band.getAttribute('y')));
   const total=svg.querySelector('[data-growth-total-label]');assert.match(total.textContent,/All neurotech \+13.6%/);assert.equal(total.getAttribute('font-weight'),'700');
   assert.ok(svg.querySelector('[data-growth-axis]').contains(total));assert.ok(svg.querySelector('[data-growth-axis]').contains(legend));
   assert.equal(svg.querySelector('[data-growth-context-legend]'),null,'No redundant top caption block');
   assert.doesNotMatch(svg.textContent,/Gray:|Dashed:/i);
  }
  const svg=document.querySelector('dialog [data-growth-export]');
  assert.ok(parseFloat(svg.style.fontSize)>=14.5);
  const headings=[...svg.querySelectorAll('[data-growth-section]')];assert.equal(headings.length,7);
  for(const heading of headings){assert.equal(heading.textContent,heading.textContent.toUpperCase());assert.equal(heading.style.fill,'var(--muted)');}
  const method=[...svg.querySelectorAll('[data-growth-row]')].slice(0,4);
  assert.equal(Number(method[1].querySelector('circle').getAttribute('cy'))-Number(method[0].querySelector('circle').getAttribute('cy')),32);
 }finally{await cleanup();}
});

test('endpoint labels remain legible where benchmark lines cross them',async()=>{
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  await chooseBaseline(document.querySelector('dialog'),'matched');
  for(const label of document.querySelectorAll('[data-growth-label]')) {
   assert.equal(label.getAttribute('stroke'),'var(--surface)');
   assert.ok(Number(label.getAttribute('stroke-width'))>=3);
   assert.equal(label.getAttribute('paint-order'),'stroke');
  }
 }finally{await cleanup();}
});

test('the zero tick remains inside the initial narrow viewport instead of beyond the label gutter',async()=>{
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  const {readFileSync}=await import('node:fs');const style=document.createElement('style');
  style.textContent=readFileSync(new URL('../src/components/publication-charts.css',import.meta.url),'utf8');document.head.append(style);
  const svg=document.querySelector('dialog [data-growth-export]');const canvas=svg.parentElement;
  const width=Number(svg.getAttribute('viewBox').split(' ')[2]);
  const minWidth=parseFloat(getComputedStyle(canvas).minWidth);assert.equal(minWidth,640);
  assert.equal(parseFloat(getComputedStyle(svg).minWidth),640);
  assert.ok(parseFloat(svg.style.fontSize)*minWidth/width>=11,'Keep the reference labels readable on narrow screens');
  const tick=document.querySelector('dialog [data-growth-sticky-axis] [data-growth-tick]');
  assert.ok(Number(tick.getAttribute('x'))*minWidth/width<=240,'A 240px narrow plot must show the zero tick without horizontal scrolling');
  const select=document.querySelector('dialog [data-growth-baseline]');assert.equal(getComputedStyle(select).maxWidth,'100%');
 }finally{await cleanup();}
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
   const footerBox=sticky.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
   assert.equal(parseFloat(sticky.style.marginTop),-footerBox[3]/footerBox[2]*100,'Sticky footer exactly covers the static footer at scroll-bottom');
   if(region.classList.contains('publication-preview'))assert.ok(footerBox[3]/parseFloat(svg.style.fontSize)<=7,'Preview footer leaves room for actual rows');
   assert.equal(svg.parentElement,sticky.parentElement,'Share a horizontally scrollable coordinate canvas');
   assert.equal(svg.getAttribute('viewBox').split(' ')[2],sticky.querySelector('svg').getAttribute('viewBox').split(' ')[2]);
   const nativeAxis=svg.querySelector('[data-growth-axis]');assert.ok(nativeAxis,'Standalone SVG keeps its own axis');
   const stickyAxis=sticky.querySelector('[data-growth-axis]').cloneNode(true);stickyAxis.setAttribute('transform',nativeAxis.getAttribute('transform'));
   assert.equal(stickyAxis.outerHTML,nativeAxis.outerHTML,'Ticks, aggregate annotation and actual legend share exact footer geometry');
  }
  const svg=document.querySelector('dialog .publication-full-plot svg');
  const image=buildChartImage({svg,title:'Publication growth',anchor:'publication-growth',notes:publicationExportNotes(1,parsed,data)},'https://atlas.example/field-velocity');
  const exported=new window.DOMParser().parseFromString(image.svg,'image/svg+xml');
  assert.equal(exported.querySelector('parsererror'),null);
  assert.equal(exported.querySelectorAll('svg svg').length,1,'Export uses only the complete plot, not the sticky duplicate');
  assert.match(image.svg,/Growth, 2022–2025/);assert.match(image.svg,/All-science/);assert.match(image.svg,/All neurotech/);
  const plot=exported.querySelector('svg svg');
  assert.ok(plot.querySelector('rect'));assert.ok(plot.querySelector('line[stroke-dasharray="5 5"]'));
  for(const label of ['Science baseline','Above baseline','Within','Below'])assert.equal([...plot.querySelectorAll('text')].filter(text=>text.textContent===label).length,1);
  assert.equal(plot.querySelectorAll('circle').length,24,'21 endpoints plus the three actual legend dots');
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

test('native growth exports snapshot the selected baseline with one self-contained plot legend',async()=>{
 const snapshots=[];const create=URL.createObjectURL;
 const cleanup=await mount(chart(fixture()),'#publication-growth');
 try {
  // Capture the real SVG passed to the native raster boundary; no canvas is emulated.
  URL.createObjectURL=blob=>{snapshots.push(blob);return 'blob:publication-test';};
  const modal=document.querySelector('dialog');
  for(const baseline of ['science','matched']) {
   await chooseBaseline(modal,baseline);
   await click(modal.querySelector('[data-download-chart="publication-growth"]'));
   const image=await snapshots.at(-1).text();const exported=new window.DOMParser().parseFromString(image,'image/svg+xml');
   assert.equal(exported.querySelector('parsererror'),null);assert.doesNotMatch(image,/var\(|NaN|Infinity/);
   const plot=exported.querySelector('svg svg');assert.ok(plot);
   assert.equal(plot.querySelectorAll('circle').length,baseline==='science'?24:25);
   assert.equal(plot.querySelectorAll('rect').length,baseline==='science'?1:0);
   for(const label of ['Above baseline','Within','Below'])assert.equal([...exported.querySelectorAll('text')].filter(text=>text.textContent===label).length,1);
   assert.equal([...exported.documentElement.children].filter(node=>['circle','line'].includes(node.localName)).length,0,'No second appended legend');
   const text=[...exported.querySelectorAll('text')].map(node=>node.textContent).join(' ');
   assert.match(text,new RegExp(`Selected comparison baseline: ${baseline==='science'?'General science':'Matched to each group'}`));
   assert.match(text,/OpenAlex work ID/);assert.match(text,/P2 two-topic whole-work involvement/);assert.match(text,/author-fractional works/);
   assert.doesNotMatch(image,/outlined diamond|Optional alternatives/);
   if(baseline==='matched') {
    assert.match(plot.textContent,/Baseline unavailable/);assert.match(plot.textContent,/Category baseline/);
    assert.doesNotMatch(plot.textContent,/Science baseline/);
    assert.equal([...plot.querySelectorAll('line')].filter(line=>line.getAttribute('stroke-width')==='3').length,10,'Nine row references plus the tick legend');
   }else assert.match(plot.textContent,/Science baseline/);
  }
  assert.equal(snapshots.length,2);
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
  if(index===1){const exported=new window.DOMParser().parseFromString(image.svg,'image/svg+xml');const text=[...exported.querySelectorAll('text')].map(node=>node.textContent).join(' ');assert.match(text,/OpenAlex work ID/);assert.match(text,/N = P2 two-topic whole-work involvement/);assert.match(text,/Asia: N \(P2\) 10/);assert.match(text,/author-fractional works/);}
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

test('missing all-neurotech and science denominators stay explicit and left-anchored in both footers',async()=>{
 const s=fixture();for(const row of s.tables.nt_yearly.rows.filter(row=>row[0]==='2022'))row[2]=0;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  for(const region of [document.querySelector('dialog .publication-plot-1'),document.querySelector('[data-publication-card="publication-growth"] .publication-preview')]) {
   assert.equal(region.querySelector('[data-neurotech-average]'),null,'No fabricated aggregate reference');
   assert.equal(region.querySelector('[data-science-context]'),null,'No band with a missing denominator');
   for(const label of region.querySelectorAll('[data-growth-total-label]')) {
    assert.equal(label.textContent,'All neurotech: no 2022 base');assert.equal(label.getAttribute('x'),'8');assert.equal(label.getAttribute('text-anchor'),'start');
   }
   assert.equal(region.querySelectorAll('svg:first-child [data-growth-row][data-baseline-status="unavailable"]').length,21);
  }
  await chooseBaseline(document.querySelector('dialog'),'matched');
  assert.equal(document.querySelectorAll('dialog [data-growth-reference-tick]').length,9,'Category baselines remain valid independently of the missing aggregate denominator');
 }finally{await cleanup();}
});

test('an absent matched feed honestly labels all 21 references unavailable',async()=>{
 const cleanup=await mount(chart(syntheticPublicationSnapshot()),'#publication-growth');
 try {
  const svg=document.querySelector('dialog .publication-full-plot svg');
  assert.match(document.querySelector('dialog .pc-methodology').textContent,/0 same-category comparisons available; 21 unavailable/);
  const modal=document.querySelector('dialog');assert.match(modal.querySelector('select').textContent,/0 available/);
  await chooseBaseline(modal,'matched');
  assert.equal(svg.querySelectorAll('[data-growth-reference-tick]').length,0);
  assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length,21);
  assert.equal(svg.querySelectorAll('[data-growth-row][data-baseline-status="unavailable"]').length,21);
  assert.equal(svg.querySelector('[data-science-context]'),null);
 }finally{await cleanup();}
});

test('matched scalar thresholds use exact above and below comparisons with no tolerance band',async()=>{
 const s=fixture();
 for(const [id,n0,n1,d0,d1] of [['asia',10,11,1000,1200],['conference',1000000,1200001,100000000,120000000]]) {
  const row=s.matchedGrowth.rows.find(row=>row.id===id);
  row.numeratorCounts={'2022':n0,'2025':n1};row.referenceCounts={'2022':d0,'2025':d1};
  row.neuroGrowthPct=(n1/n0-1)*100;row.referenceGrowthPct=(d1/d0-1)*100;
  row.shares={'2022':n0/d0,'2025':n1/d1};row.relativeShareGrowthPct=(n1*d0/(d1*n0)-1)*100;row.growthGapPercentagePoints=row.neuroGrowthPct-row.referenceGrowthPct;
 }
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  await chooseBaseline(document.querySelector('dialog'),'matched');
  for(const [id,status,color] of [['asia','below','#e8a132'],['conference','above','#4b4df2']]) {
   const mark=document.querySelector(`dialog [data-growth-row="${id}"]`);
   assert.equal(mark.dataset.baselineStatus,status);assert.equal(mark.querySelector('circle').getAttribute('fill'),color);
  }
 }finally{await cleanup();}
});

test('a zero matched reference denominator is unavailable rather than a global fallback',async()=>{
 const s=fixture(),row=s.matchedGrowth.rows.find(row=>row.id==='asia');
 row.numeratorCounts={'2022':0,'2025':15};row.referenceCounts={'2022':0,'2025':1200};
 row.neuroGrowthPct=null;row.referenceGrowthPct=null;row.shares={'2022':null,'2025':.0125};row.relativeShareGrowthPct=null;row.growthGapPercentagePoints=null;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  const modal=document.querySelector('dialog');await chooseBaseline(modal,'matched');
  assert.match(modal.querySelector('[data-growth-baseline]').textContent,/8 available/);
  assert.match(modal.querySelector('[data-growth-coverage]').textContent,/8.*13.*no.*fallback/);
  const svg=modal.querySelector('[data-growth-export]'),mark=svg.querySelector('[data-growth-row="asia"]');
  assert.equal(mark.dataset.baselineStatus,'unavailable');assert.equal(mark.querySelector('[data-growth-reference-tick]'),null);
  assert.match(mark.textContent,/No 2022 base/);assert.doesNotMatch(svg.outerHTML,/NaN|Infinity/);
 }finally{await cleanup();}
});

test('exactly equal matched growth is within its scalar baseline with a visible local tick',async()=>{
 const s=fixture();const row=s.matchedGrowth.rows.find(r=>r.id==='asia');
 row.numeratorCounts={'2022':10,'2025':12};row.neuroGrowthPct=20;row.shares={'2022':.01,'2025':.01};row.relativeShareGrowthPct=0;row.growthGapPercentagePoints=0;
 const cleanup=await mount(chart(s),'#publication-growth');
 try {
  await chooseBaseline(document.querySelector('dialog'),'matched');
  const mark=document.querySelector('dialog [data-growth-row="asia"]');
  assert.equal(mark.dataset.baselineStatus,'within');assert.equal(mark.querySelector('circle').getAttribute('fill'),'#98a2b3');
  const circle=mark.querySelector('circle'),tick=mark.querySelector('[data-growth-reference-tick]');
  assert.equal(circle.getAttribute('cx'),tick.getAttribute('x1'));
  assert.ok(Number(tick.getAttribute('y2'))-Number(tick.getAttribute('y1'))>2*Number(circle.getAttribute('r')),'Tick remains visible above and below the endpoint');
 }finally{await cleanup();}
});
