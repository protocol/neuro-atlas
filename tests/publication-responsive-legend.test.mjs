import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { syntheticPublicationSnapshot } from './fixtures/publication-synthetic.mjs';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { mount } from './modal-helpers.mjs';
globalThis.React=React;
const snapshot=syntheticPublicationSnapshot();

test('narrow sector modal has a source-valued HTML key beside the waffle, independently of horizontal SVG scroll',async()=>{
 const cleanup=await mount(React.createElement(PublicationCharts,{snapshot,allowTestFixture:true}),'#researcher-sectors');
 try {
  const key=document.querySelector('dialog [data-publication-sector-key]');
  assert.ok(key,'An HTML key must name colors even when the SVG legend is horizontally offscreen');
  assert.match(key.textContent,/100/);
  for(const n of ['72','13','14','1'])assert.match(key.textContent,new RegExp(n));
  assert.equal(key.querySelectorAll('li').length,4);
  assert.match(key.textContent,/No listed affiliation/);
 }finally{await cleanup();}
});

test('annual legend matches the blue neurotech series',async()=>{
 const cleanup=await mount(React.createElement(PublicationCharts,{snapshot,allowTestFixture:true}),'#publication-output');
 try {
  const key=document.querySelector('dialog .publication-legend [data-series-key="neurotech"]');
  assert.ok(key,'The neurotech legend needs its own matching series color');
  assert.equal(key.style.color,'rgb(17, 94, 247)');
 }finally{await cleanup();}
});
