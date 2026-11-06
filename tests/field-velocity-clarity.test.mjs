import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';

globalThis.React=React;
const plots=Object.values(METRIC_CHART_EVIDENCE).flatMap(e=>e.plots);
const render=(plot,preview)=>new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot,preview})),{url:'http://localhost'}).window.document;

test('compact previews have no unexplained numbered keys while full charts retain their keyed observations',()=>{
  const plot=plots.find(p=>p.id==='recording-hours');
  const preview=render(plot,true),full=render(plot,false);
  assert.equal(preview.querySelectorAll('[data-annotation-key],[data-annotation-leader]').length,0);
  assert.ok(full.querySelectorAll('[data-annotation-key]').length>0);
  assert.equal(preview.querySelectorAll('[data-source-observation]').length,plot.points.length);
  assert.equal(full.querySelectorAll('[data-source-observation]').length,plot.points.length);
  assert.ok(preview.querySelector('[data-visible-qualifications]'));
});

test('preview split–merge axes use round tick positions rather than relabeled fractional subdivisions',()=>{
  const plot=plots.find(p=>p.id==='connectomics-roboem-human-split-merge');
  const doc=render(plot,true);
  const ticks=[...doc.querySelectorAll('.draft-plot-tick')].map(e=>e.textContent);
  assert.ok(ticks.includes('2')&&ticks.includes('4')&&ticks.includes('6'),JSON.stringify(ticks));
  assert.ok(!ticks.some(t=>/7\.831|5\.873|1\.957/.test(t)),JSON.stringify(ticks));
  const yTick=doc.querySelector('[data-preview-y-tick="6"]');
  assert.ok(yTick,'Tick value is represented at its actual numeric position');
});


test('catalog utilities are grouped quietly and section type is distinct from chart titles', async()=>{
  const {readFileSync}=await import('node:fs');
  const imported=await import('../src/app/field-velocity/page.tsx');
  const Page=imported.default.default??imported.default;
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(Page)),{url:'http://localhost'}).window.document;
  const utilities=doc.querySelector('.metrics-utilities[role="group"]');
  assert.ok(utilities,'Group the secondary catalog controls separately from search');
  assert.equal(utilities.querySelectorAll('button').length,3);
  const style=doc.createElement('style');style.textContent=readFileSync('src/components/draft-chart-plot.css','utf8');doc.head.append(style);
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector('.metric-category h2 > button')).fontSize,'18px');
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector('.metric-preview-context')).fontSize,'12px');
});

test('inflection evidence roles precede measurement links and forecast disclosures have usable hit areas', async()=>{
  const {readFileSync}=await import('node:fs');
  const imported=await import('../src/components/sections/expectations-section.tsx');
  const Section=imported.ExpectationsSection??imported.default.ExpectationsSection;
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(Section)),{url:'http://localhost'}).window.document;
  for(const link of doc.querySelectorAll('[data-related-measurement]'))assert.ok(link.previousElementSibling?.hasAttribute('data-measurement-relationship'));
  const style=doc.createElement('style');style.textContent=readFileSync('src/components/draft-chart-plot.css','utf8');doc.head.append(style);
  const role=doc.querySelector('[data-measurement-relationship]');
  assert.equal(doc.defaultView.getComputedStyle(role).fontSize,'12px');
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector('[data-related-forecasts] summary')).minHeight,'32px');
});
