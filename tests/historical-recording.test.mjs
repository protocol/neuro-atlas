import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {PerformanceCurves} from '../src/components/performance-curves.tsx';
import {selectPerformance} from '../src/lib/field-velocity/performance.ts';
import {mount} from './modal-helpers.mjs';
const snapshot=readFileSync('src/data/field-velocity/neurotech.snapshot.json');
const data=selectPerformance(JSON.parse(snapshot));
const provenance=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json'));
globalThis.React=React;
test('historical tracker is the real default preview and modal, reproducing first-ten-papers eligibility and fit',async()=>{
 const mod=await import('../src/data/historical-recording.ts').catch(()=>({}));
 assert.ok(mod.HISTORICAL_RECORDING,'Frozen historical tracker data exists');
 const {HISTORICAL_RECORDING:historical,HISTORICAL_RECORDING_FIT:fit}=mod;
 assert.equal(historical.points.length,94);
 assert.equal(fit.n,94);
 assert.equal(mod.HISTORICAL_RECORDING_ROWS.length,162);
 assert.ok(fit.doublingYears>5 && fit.doublingYears<10);
 assert.equal(historical.points.some(p=>p.value===1136223),false);
 const cleanup=await mount(React.createElement(PerformanceCurves,{data,provenance,flat:true,selection:['simultaneously-recorded-neurons']}),'#simultaneously-recorded-neurons');
 try{
  assert.equal(document.querySelector('[data-recording-view-select]').value,'historical');
  assert.equal(document.querySelectorAll('.pc-preview circle').length,94);
  assert.equal(document.querySelectorAll('dialog [data-curve-point]').length,94);
  assert.ok(document.querySelector('.pc-preview [data-historical-fit]'));
  assert.ok(document.querySelector('dialog [data-historical-fit]'));
  assert.match(document.querySelector('dialog').textContent,/first 10 papers/i);
  assert.equal(document.querySelector('[role=tooltip]'),null);
  const payload=JSON.parse(decodeURIComponent(document.querySelector('[data-recording-source-json]').href.split(',')[1]));
  assert.equal(payload.view.id,'historical');assert.equal(payload.fit.n,94);
 }finally{await cleanup();}
 assert.deepEqual(readFileSync('src/data/field-velocity/neurotech.snapshot.json'),snapshot);
});
