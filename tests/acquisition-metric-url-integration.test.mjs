import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {DraftChartPanel} from '../src/components/draft-chart-panel.tsx';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {mount,click,settle} from './modal-helpers.mjs';
import {brainScaleClock} from './brain-scale-helpers.mjs';
globalThis.React=React;
const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
const anchor='metric-panel-acquisition-economics';
const slug='estimated-acquisition-efficiency-voxels-per-dollar';
test('actual acquisition controls restore and share their URL metric and clear the efficiency-only reference when switching to reciprocal',async()=>{
 const clock=brainScaleClock(true);
 const cleanup=await mount(React.createElement(DraftChartPanel,{plot,anchor}),'#'+slug,win=>{
  clock.configure(win);
  win.history.replaceState({kept:'router-state'},'',`/field-velocity?tag=first&tag=second&acquisitionMetric=voxels-per-dollar&brainScale=acquisition-economics#${slug}`);
 });
 try{
  const chosen=()=>document.querySelector('dialog[open] [data-acquisition-metric][aria-pressed=true]')?.dataset.acquisitionMetric;
  assert.equal(chosen(),'voxels-per-dollar','fresh URL selects efficiency instead of the default cost view');
  assert.equal(document.querySelector('dialog[open] [data-brain-scale-toggle]').getAttribute('aria-checked'),'true');
  await click(document.querySelector('dialog[open] [data-acquisition-metric=dollars-per-voxel]'));
  assert.equal(new URL(window.location.href).searchParams.get('acquisitionMetric'),'dollars-per-voxel');
  assert.deepEqual(new URL(window.location.href).searchParams.getAll('tag'),['first','second']);
  assert.equal(new URL(window.location.href).searchParams.has('brainScale'),false,'reciprocal clears reference URL state');
  assert.equal(window.history.state.kept,'router-state');
  assert.equal(chosen(),'dollars-per-voxel');
  await act(async()=>window.history.back());await settle();
  assert.equal(chosen(),'voxels-per-dollar');
  await act(async()=>window.history.forward());await settle();
  assert.equal(chosen(),'dollars-per-voxel');
  await click(document.querySelector('dialog[open] [data-acquisition-metric=voxels-per-dollar]'));
  assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'),false,'default needs no query token');
  assert.equal(new URL(window.location.href).searchParams.has('brainScale'),false,'reciprocal clears reference URL state');
  assert.equal(chosen(),'voxels-per-dollar');
 }finally{await cleanup();}
});
