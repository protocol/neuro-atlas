import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {PerformanceCurves} from '../src/components/performance-curves.tsx';
import {selectPerformance} from '../src/lib/field-velocity/performance.ts';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {mount} from './modal-helpers.mjs';
globalThis.React=React;
test('compact imaging header and units leave space for the actual trend at narrow rail widths',async()=>{
 const cleanup=await mount(React.createElement(DraftChartPlot,{plot:METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0],preview:true}));
 try{assert.equal(document.querySelector('figcaption').textContent,'Imaging efficiency');assert.equal(document.querySelector('svg text').textContent,'Approx. $ to image one human brain (log)');const svg=document.querySelector('svg');assert.ok(Number(svg.getAttribute('viewBox').split(' ')[3])<=180,'compact plot fits card body with actual date axes');assert.deepEqual([...svg.querySelectorAll('text')].map(e=>e.textContent).filter(t=>/^20\d{2}$/.test(t)),['2015','2020','2025']);}finally{await cleanup();}
});
test('historical preview uses short readable units and an experiment-count heading, preserving full modal identity',async()=>{
 const feed=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json'));
 const provenance=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json'));
 const cleanup=await mount(React.createElement(PerformanceCurves,{data:selectPerformance(feed),provenance,flat:true,selection:['simultaneously-recorded-neurons']}));
 try{assert.equal(document.querySelector('.pc-card-title').textContent,'Neurons per experiment');assert.equal(document.querySelector('.pc-preview svg text').textContent,'Neurons · log');}finally{await cleanup();}
});
