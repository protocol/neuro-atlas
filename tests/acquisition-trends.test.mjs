import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {DRAFT_CHART_EVIDENCE} from '../src/data/draft-chart-observations.ts';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {brainBenchmarkContext,brainImageVoxels,BRAIN_IMAGE_MODEL} from '../src/lib/connectomics-brain-benchmarks.ts';
globalThis.React=React;
const raw=DRAFT_CHART_EVIDENCE['Connectomics imaging throughput over time'].plots.find(p=>p.id==='acquisition-economics');
const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
test('voxels per dollar retains nine archived observations and fits the two specified achieved method families',()=>{
  assert.match(plot.yLabel,/voxels\/\$/i);
  for(const p of raw.points) assert.ok(Math.abs(plot.points.find(q=>q.id===p.id).y*p.y-1)<1e-12,p.id);
  assert.equal(raw.points.length,9);assert.equal(plot.points.length,10);
  assert.equal(plot.points.find(p=>p.id==='exaspim2024').y,1e11);
  assert.match(plot.points.find(p=>p.id==='exaspim2024').note,/author estimate.*Glaser.*2025/i);
  assert.deepEqual(plot.referenceTrendlines.map(f=>f.fit.inputIds),[
    ['exm2015','exllsm2019','exaspim2023','exaspim2024'],
    ['sem2018','multisem506','multisem706','bdtem2024'],
  ]);
  assert.equal(plot.points.find(p=>p.id==='peem2024').marker,'triangle');
  for(const preview of [true,false]){
    const doc=new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot,preview}))).window.document;
    assert.equal(doc.querySelectorAll('[data-reference-trendline]').length,2);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length,10);
    assert.match(doc.body.textContent,/author estimate/i);
    assert.doesNotMatch(doc.body.textContent,/citation mismatch|HiExM/i);
    assert.match(doc.body.textContent,/prospective/i);
  }
});
test('human-brain budgets have reciprocal voxels-per-dollar units',()=>{
 const context=brainBenchmarkContext('acquisition-economics');
 for(const ref of context.references) assert.equal(ref.value,brainImageVoxels(BRAIN_IMAGE_MODEL.volumesMm3.human)/ref.budget);
 assert.match(context.disclosure,/voxels\/\$ = human voxels ÷ budget/);
});
