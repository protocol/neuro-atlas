import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const points = [2018,2023].map((x,i)=>({id:`p${i}`,x,y:i+1,label:`Fixture ${i}`,dateLabel:`${x}`,sourceTitle:'Synthetic source',sourceUrl:'https://example.org',quote:'Fixture'}));
const plot = {id:'fixture',title:'Fixture',xKind:'year',xLabel:'Publication year',yLabel:'Units',scale:'linear',scope:'Synthetic only.',points};

test('desktop rails use broader landscape cards while narrow rails trade excess peek for readable content', () => {
  const css = readFileSync('src/components/draft-chart-plot.css','utf8');
  const dom = new JSDOM(`<style>${css}</style>`, {url: 'https://example.org'});
  try {
    const rules = [...dom.window.document.styleSheets[0].cssRules];
    const content = rules.find(rule => rule.selectorText === '.metric-category-content');
    assert.equal(content.style.getPropertyValue('--metric-card-width'), 'calc((100% - 1rem)/1.25)');
    for (const rail of [800,1087,1248]) {
      const card = (rail - 16) / 1.25, next = rail - card - 16;
      assert.ok(card / rail >= .78 && card / rail <= .8);
      assert.ok(next >= 120, 'A real slice of the following card still signals horizontal scrolling');
      assert.ok(card / 220 > 2, 'Landscape plot, without reducing typography');
    }
    const mobile = rules.filter(rule => rule.conditionText === '(max-width: 560px)').flatMap(rule => [...rule.cssRules]).find(rule => rule.selectorText === '.metric-category-content');
    assert.equal(mobile.style.getPropertyValue('--metric-card-width'), 'calc(100% - 1.5rem)');
    const rail = rules.find(rule => rule.selectorText === '.metric-chart-rail');
    assert.equal(rail.style.getPropertyValue('overflow-x'), 'auto');
    assert.equal(rail.style.getPropertyValue('scroll-snap-type'), 'x proximity');
    const equal = rules.find(rule => rule.selectorText?.includes(':has([data-metric-card-body])') && rule.style.getPropertyValue('min-height'));
    assert.equal(equal.style.getPropertyValue('min-height'), 'var(--metric-card-height, 0px)', 'Retain the measured equal-height contract');
  } finally { dom.window.close(); }
});

test('draft previews are shorter without altering the expanded scientific chart coordinate frame', () => {
  const height = preview => {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot,preview})));
    try { return Number(dom.window.document.querySelector('.draft-plot-svg').getAttribute('viewBox').split(' ')[3]); } finally {dom.window.close();}
  };
  assert.equal(height(false), 340, 'Expanded chart stays at its original height');
  assert.equal(height(true), 308, 'Only preview plotting height is reduced, by 32px');
  const timeline = {scope:'Synthetic only.',events:['Research','Prototype','Demonstration'].map((stage,i)=>({...points[i%2],id:`e${i}`,year:2018+i,stage,note:'Fixture'}))};
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftEventTimeline,{timeline,preview:true})));
  try {
    const svg = dom.window.document.querySelector('svg'), height = Number(svg.getAttribute('viewBox').split(' ')[3]);
    assert.equal(height,316);
    for (const circle of svg.querySelectorAll('[data-source-event]')) assert.ok(Number(circle.getAttribute('cy')) + 6 < height - 60);
  } finally {dom.window.close();}
});

test('rail curve previews reflow to the measured content width, rather than growing taller as cards grow wider', async () => {
  const curve = {title:'Fixture',unit:'Units',scale:'linear',line:false,tracks:[{id:'fixture',label:'Fixture'}],points:points.map(p=>({date:`${p.x}-01-01`,value:p.y,label:p.label,track:'fixture',trackIndex:0}))};
  const cleanup = await mount(React.createElement('section',{className:'metrics-index'},React.createElement(CurveCard,{id:'tissue-mapped',title:curve.title,eyebrow:'Fixture',coverage:'Scope',plot:curve})),'#tissue-mapped', window => {
    window.Element.prototype.getBoundingClientRect = () => ({width:780,height:220});
    window.SVGElement.prototype.getScreenCTM = () => ({a:1,b:0});
  });
  try {
    const preview = document.querySelector('.pc-preview svg'), full = document.querySelector('dialog svg');
    assert.equal(preview.getAttribute('viewBox'),'0 0 780 220', 'Landscape geometry uses content pixels, not scaled 360×220');
    assert.equal(full.getAttribute('viewBox'),'0 0 720 300', 'Expanded/export frame is not changed by the rail');
    assert.equal(preview.style.fontSize,'12px');
    for (const mark of preview.querySelectorAll('circle')) assert.equal(Number(mark.getAttribute('r')),5);
  } finally {await cleanup();}
});

test('Trends previews reserve a shorter plotting region without changing the expanded time-series geometry', async () => {
  const cleanup = await mount(React.createElement(GoogleTrends,{flat:true,selection:['neurotech']}),'#google-trends-neurotech');
  try {
    assert.equal(document.querySelector('.gt-preview svg').getAttribute('viewBox'),'0 0 560 238');
    assert.equal(document.querySelector('dialog svg').getAttribute('viewBox'),'0 0 600 270');
  } finally {await cleanup();}
});
