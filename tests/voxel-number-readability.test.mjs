import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import React from 'react';
import {mount} from './modal-helpers.mjs';
globalThis.React=React;

test('voxel axes, image keys and budget labels use the readable scale without changing exact values',async()=>{
 const {METRIC_CHART_EVIDENCE}=await import('../src/data/metric-chart-visibility.ts');
 const {DraftChartPlot}=await import('../src/components/draft-chart-plot.tsx');
 const {brainBenchmarkContext}=await import('../src/lib/connectomics-brain-benchmarks.ts');
 const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
 assert.equal(plot.points.find(p=>p.id==='exaspim2024').y,1e11);
 for(const p of plot.points)assert.doesNotMatch(p.exportAnnotation,/\de[+-]?\d/);
 for(const r of brainBenchmarkContext('acquisition-economics').references)assert.doesNotMatch(r.label,/\de[+-]?\d/);
 const cleanup=await mount(React.createElement(DraftChartPlot,{plot,preview:true}));
 try{assert.deepEqual([...document.querySelectorAll('[data-preview-y-tick]')].map(e=>e.textContent),['$19T','$1.9T','$190B','$19B']);}finally{await cleanup();}
});

test('voxel scale uses readable billion and trillion labels without scientific notation',async()=>{
 assert.ok(existsSync('src/lib/large-count-label.ts'),'shared display-only count formatter');
 const {compactCount,countWords}=await import('../src/lib/large-count-label.ts');
 for(const [value,short,words] of [[1e8,'100M','100 million'],[1e9,'1B','1 billion'],[1/(1e-9),'1B','1 billion'],[1e11,'100B','100 billion'],[1e12,'1T','1 trillion'],[1.875e16,'18.8Q','18.8 quadrillion'],[6.5e9,'6.5B','6.5 billion']]){assert.equal(compactCount(value),short);assert.equal(countWords(value),words);}
});
