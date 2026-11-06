import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import {readFileSync} from 'node:fs';
import {PublicationCharts} from '../src/components/publication-charts.tsx';
import {mount} from './modal-helpers.mjs';
import {buildChartImage} from '../src/lib/chart-export.ts';
globalThis.React=React;
const snapshot=JSON.parse(readFileSync(new URL('../src/data/publications/publication-charts.snapshot.json',import.meta.url),'utf8'));
test('researcher sectors: reference-like 24px counts and 16px labels survive resizing and canonical export',async()=>{
 const original=globalThis.ResizeObserver,observers=[];
 let scale=1;
 globalThis.ResizeObserver=class {constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}disconnect(){this.disconnected=true;}};
 let cleanup;
 try {
  cleanup=await mount(React.createElement(PublicationCharts,{snapshot}),'#researcher-sectors',win=>{
   win.SVGElement.prototype.getScreenCTM=()=>({a:scale,b:0});
   win.SVGElement.prototype.getBoundingClientRect=()=>({width:740,height:370});
  });
  const svg=document.querySelector('dialog .publication-full-plot svg');
  const groups=[...svg.querySelectorAll('g[data-publication-mark]')];
  assert.equal(groups.length,4);
  for(const next of [.6,1,1.4]) {
   scale=next;
   await act(async()=>{for(const o of observers.filter(o=>!o.disconnected))o.callback([{contentRect:{width:740*scale,height:370*scale}}]);});
   for(const group of groups) {
    const [count,label]=group.querySelectorAll('text');
    assert.ok(Math.abs(parseFloat(count.style.fontSize)*scale-24)<.001,'Counts render at 24 CSS px');
    assert.ok(Math.abs(parseFloat(label.style.fontSize)*scale-16)<.001,'Sector labels render at 16 CSS px');
    assert.equal(count.getAttribute('font-weight'),'700');
    assert.equal(count.dataset.exportFontSize,'24');assert.equal(label.dataset.exportFontSize,'16');
   }
  }
  const image=buildChartImage({svg,title:'Researchers by publication sector',anchor:'researcher-sectors',notes:[]},'https://atlas.example/field-velocity');
  const exported=new window.DOMParser().parseFromString(image.svg,'image/svg+xml');
  for(const group of groups) {
   const [count,label]=group.querySelectorAll('text');
   const all=[...exported.querySelectorAll('text')];
   assert.equal(all.find(t=>t.textContent===count.textContent).getAttribute('font-size'),'24');
   assert.equal(all.find(t=>t.textContent===label.textContent).getAttribute('font-size'),'16');
  }
  const source=JSON.parse(decodeURIComponent(document.querySelector('dialog a[download$="-source.json"]').href.split(',')[1]));
  assert.deepEqual(source.tables.nt_talent_table,snapshot.tables.nt_talent_table,'Font-only edit preserves original source values');
 }finally{if(cleanup)await cleanup();if(original===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=original;}
});
