import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';
import { calendarBounds, reportInterval, translationPlot, TRANSLATION_EVIDENCE } from '../src/lib/field-velocity/translation-evidence.ts';

test('report intervals retain calendar precision, exact endpoint arithmetic, and separate clinical tracks',()=>{
 const pair=TRANSLATION_EVIDENCE.intervals.find(pair=>pair.id==='utah-braingate');
 const interval=reportInterval(pair);
 const year=365.2425*86400000;
 assert.equal(interval.lo,(Date.UTC(2004,5,1)-Date.UTC(2002,2,14))/year);
 assert.equal(interval.hi,(Date.UTC(2004,5,30)-Date.UTC(2002,2,14))/year);
 assert.deepEqual(calendarBounds('2024-02','month'),[Date.UTC(2024,1,1),Date.UTC(2024,1,29)]);
 assert.deepEqual(calendarBounds('2025','year'),[Date.UTC(2025,0,1),Date.UTC(2025,11,31)]);
 for(const [date,precision] of [['2025-02-29','day'],['2025-13','month'],['2025-01-01','year'],['2025','decade']]) assert.throws(()=>calendarBounds(date,precision));
 const invalid=structuredClone(pair);invalid.human.date='1990-06';assert.throws(()=>reportInterval(invalid),/chronology/);
 const unsafe=structuredClone(pair);unsafe.report.url='http://example.org';assert.throws(()=>reportInterval(unsafe),/Unsourced/);
 const empty=structuredClone(pair);empty.human.quotes=[];assert.throws(()=>reportInterval(empty),/Unsourced/);
 const plot=translationPlot();assert.equal(plot.line,false);
 assert.equal(plot.points.filter(p=>p.track==='implant').length,4);
 assert.equal(plot.points.filter(p=>p.track==='temporary-placement').length,1);
});
globalThis.React=React;
const feed=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json','utf8'));

test('latency uses explicitly defined report-to-human intervals with direct endpoint sources and researched company coverage',async()=>{
 const cleanup=await mount(React.createElement(PaceReadings,{data:selectPace(feed),flat:true}),'#latency_compression');
 try{
  const card=document.querySelector('[data-performance-card="latency_compression"]');
  assert.match(card.querySelector('.pc-coverage').textContent,/report.to.human/i);
  const modal=document.querySelector('dialog[open]');
  const identity=modal.querySelector('[data-latency-identity]');
  assert.ok(identity,'Opening view must identify the substituted metric before the plot');
  assert.match(identity.textContent,/Selected report-to-human intervals/);
  assert.match(identity.textContent,/Fieldwide acceleration remains unmeasured/);
  assert.ok(identity.compareDocumentPosition(modal.querySelector('.pc-plot')) & 4,'Scope must precede the plotted points');
  assert.doesNotMatch(modal.textContent,/Median ~3\.3|Early cohort|recent \(>2010\)|A falling lag means/);
  assert.equal(modal.querySelectorAll('[data-curve-point]').length,5);
  assert.equal(modal.querySelector('[data-frontier-line]'),null);
  for(const id of ['neurotrophic-cone','utah-braingate','stentrode','neuralink','precision-layer7']){
   const row=modal.querySelector(`[data-latency-pair="${id}"]`);
   assert.ok(row,id);
   assert.ok(row.querySelector('a[data-source-stage="preclinical"]'));
   assert.ok(row.querySelector('a[data-source-stage="human"]'));
  }
  assert.match(modal.querySelector('[data-latency-pair="utah-braingate"]').textContent,/Blackrock/);
  assert.match(modal.querySelector('[data-latency-pair="precision-layer7"]').textContent,/temporary/i);
  assert.match(modal.querySelector('[data-latency-pathway="science-biohybrid"]').textContent,/unverified/i);
  assert.equal(modal.querySelector('[data-curve-point*="science"]'),null,'Unverified endpoints must never become zero-year points');
  assert.match(modal.textContent,/date precision|month precision/i);
 }finally{await cleanup();}
});
