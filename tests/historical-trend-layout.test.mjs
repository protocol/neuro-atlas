import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {DraftChartPanel} from '../src/components/draft-chart-panel.tsx';
import {PerformanceCurves} from '../src/components/performance-curves.tsx';
import {selectPerformance} from '../src/lib/field-velocity/performance.ts';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {mount} from './modal-helpers.mjs';
globalThis.React=React;
test('imaging fit labels occupy reserved lanes above data, never the point-number badges',async()=>{
 const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
 const cleanup=await mount(React.createElement(DraftChartPanel,{plot,anchor:'metric-panel-acquisition-economics'}),'#metric-panel-acquisition-economics');
 try{
  const svg=document.querySelector('dialog svg'),top=Math.min(...[...svg.querySelectorAll('[data-source-observation][cy]')].map(e=>Number(e.getAttribute('cy'))).filter(Number.isFinite));
  const labels=[...svg.querySelectorAll('[data-fit-direct-label]')];assert.equal(labels.length,2);
  for(const label of labels)assert.ok(Number(label.getAttribute('y'))<top-8,'dedicated annotation lane');
 }finally{await cleanup();}
});
test('historical rate label stays above observations and decade guides avoid a striped chart and colliding endpoint years',async()=>{
 const feed=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json'));
 const provenance=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json'));
 const cleanup=await mount(React.createElement(PerformanceCurves,{data:selectPerformance(feed),provenance,flat:true,selection:['simultaneously-recorded-neurons']}),'#simultaneously-recorded-neurons');
 try{
  const svg=document.querySelector('dialog svg'),top=Math.min(...[...svg.querySelectorAll('.pc-gridline')].map(e=>Number(e.getAttribute('y1'))));
  assert.ok(Number(svg.querySelector('[data-historical-fit-label]').getAttribute('y'))<top-8,'rate in annotation lane');
  assert.ok(svg.querySelectorAll('[data-year-guide]').length<=7,'decade divisions instead of annual stripes');
  assert.deepEqual([...svg.querySelectorAll('[data-year-label]')].map(e=>Number(e.dataset.yearLabel)),[1970,1980,1990,2000,2010]);
 }finally{await cleanup();}
});
