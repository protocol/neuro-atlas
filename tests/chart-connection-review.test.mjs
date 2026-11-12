import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { ParticipantCommitments } from '../src/components/participant-commitments.tsx';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
globalThis.React = React;

test('C1: citation visible note agrees with reliable-series connection', async () => {
 const feed=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json','utf8'));
 const cleanup=await mount(React.createElement(PaceReadings,{data:selectPace(feed),flat:true}),'#idea_vintage');
 try {
  assert.ok(document.querySelector('dialog [data-curve-series="idea_vintage"]'));
  assert.match(document.querySelector('dialog .pc-chart-note').textContent,/Lines connect successive reliable observations within each measurement series/);
  assert.doesNotMatch(document.querySelector('dialog .pc-chart-note').textContent,/Separate source observations/);
 } finally {await cleanup();}
});

test('C2: participant overview connects only the five source-supported Neuralink checkpoints in preview, modal and export', async () => {
 const cleanup=await mount(React.createElement(ParticipantCommitments),'#revealed_commitments');
 try {
  const full=document.querySelector('dialog svg'),preview=document.querySelector('article .pc-preview svg');
  const expected=['2024-01-01','2024-07-01','2025-02-05','2025-06-02','2026-01-28'];
  const marks=[...full.querySelectorAll('[data-curve-point]')].filter(e=>e.dataset.curvePoint.startsWith('neuralink-cumulative:'));
  assert.deepEqual(marks.map(e=>e.dataset.curvePoint.split(':')[1]),expected);
  assert.deepEqual(marks.map(e=>Number(e.dataset.value)),[1,2,3,5,21]);
  for(const svg of [preview,full]){
   const lines=[...svg.querySelectorAll('[data-curve-series]')];
   assert.deepEqual(lines.map(e=>e.dataset.curveSeries),['neuralink-cumulative']);
   assert.equal(lines[0].getAttribute('points').split(' ').length,5);
  }
  assert.equal(full.querySelector('[data-curve-series]').getAttribute('points'),marks.map(e=>`${e.getAttribute('cx')},${e.getAttribute('cy')}`).join(' '));
  const image=buildChartImage({svg:full,title:'Implanted BCI participants over time',anchor:'revealed_commitments',notes:[]},'https://example.org/field-velocity');
  const exported=new JSDOM(image.svg,{contentType:'image/svg+xml'});
  try {const lines=[...exported.window.document.querySelectorAll('polyline')]; assert.equal(lines.length,1); assert.equal(lines[0].getAttribute('points'),full.querySelector('[data-curve-series="neuralink-cumulative"]').getAttribute('points'));}
  finally {exported.window.close();}
  assert.match(document.querySelector('dialog .pc-caveat').textContent,/Cohorts overlap/);
 } finally {await cleanup();}
});
