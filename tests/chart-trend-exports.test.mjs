import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {JSDOM} from 'jsdom';
import {DraftChartPanel} from '../src/components/draft-chart-panel.tsx';
import {PerformanceCurves} from '../src/components/performance-curves.tsx';
import {selectPerformance} from '../src/lib/field-velocity/performance.ts';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {whenChartRegistered} from '../src/lib/chart-export-api.ts';
import {buildChartImage} from '../src/lib/chart-export.ts';
import {mount} from './modal-helpers.mjs';
globalThis.React=React;
test('acquisition export carries two paths, precise fit inputs and decisive visible point qualifications',async()=>{
 const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
 const cleanup=await mount(React.createElement(DraftChartPanel,{plot,anchor:'metric-panel-acquisition-economics'}),'#estimated-acquisition-cost-per-10m-voxels-optical-and-em');
 try{
  const payload=JSON.parse(decodeURIComponent(document.querySelector('[data-selected-plot-json]').href.split(',')[1]));
  assert.deepEqual(payload.referenceTrendlines.map(f=>f.fit.n),[4,4]);
  assert.match(payload.yLabel,/voxels\/\$/);
  const spec=(await whenChartRegistered('metric-panel-acquisition-economics')).getChart();
  const doc=new JSDOM(buildChartImage(spec,window.location.href).svg,{contentType:'image/svg+xml'}).window.document;
  assert.equal(doc.querySelectorAll('[data-source-observation]').length,10);
  assert.match([...doc.querySelectorAll('text')].map(n=>n.textContent).join(' '),/citation mismatch/);
  assert.match(doc.documentElement.textContent,/prospective/);
  assert.ok(spec.legend.filter(e=>e.marker==='line').length===2);
  assert.match(spec.notes.join(' '),/Input IDs/);
 }finally{await cleanup();}
});
test('historical PNG labels the real selected tracker and diagnostics; full fit stays within data bounds',async()=>{
 const data=selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json')));
 const provenance=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json'));
 const cleanup=await mount(React.createElement(PerformanceCurves,{data,provenance,flat:true,selection:['simultaneously-recorded-neurons']}),'#simultaneously-recorded-neurons');
 try{
  const spec=(await whenChartRegistered('simultaneously-recorded-neurons')).getChart();
  const doc=new JSDOM(buildChartImage(spec,window.location.href).svg,{contentType:'image/svg+xml'}).window.document;
  const visible=[...doc.querySelectorAll('text')].map(n=>n.textContent).join(' ');
  assert.match(visible,/mixed preparations/);
  assert.match(visible,/N=94.*R²/);
  assert.match(visible,/Maccione.*Approximately 3,200.*retina/);
  assert.match(visible,/Mitz.*Approximately 807.*average.*session/);
  const svg=document.querySelector('dialog .pc-chart-scroll svg');
  const line=svg.querySelector('[data-historical-fit] polyline');
  const coordinates=line.getAttribute('points').split(' ').map(s=>s.split(',').map(Number));
  const gridY=[...svg.querySelectorAll('.pc-gridline')].map(n=>Number(n.getAttribute('y1')));
  assert.ok(coordinates.every(p=>p[1]>=Math.min(...gridY) && p[1]<=Math.max(...gridY)),'Fit endpoints within quantitative frame');
 }finally{await cleanup();}
});
