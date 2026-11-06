import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const snapshot = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));

test('the final engagement count is an over-time participant chart with source-qualified separate cohorts', async () => {
 const cleanup=await mount(React.createElement(Page));
 try {
  const group=document.querySelector('[data-metrics-category="Neurotech field engagement"]');
  const card=group.querySelector('[data-performance-card="revealed_commitments"]');
  assert.ok(card, 'Replace the scalar with a real chronological chart at its retained fragment');
  assert.equal([...group.querySelectorAll('[data-metric-rail] article')].at(-5),card, 'Original final card stays immediately before the four appended publication charts');
  assert.ok(card.querySelector('svg circle'), 'Actual sourced observations appear in the preview');
  await click(card.querySelector('.pc-trigger'));
  const modal=document.querySelector('dialog[open]');
  assert.ok(modal);
  assert.match(modal.textContent,/participants/);
  const base=snapshot.measurementSeries.find(s=>s.id==='bci-implants');
  for(const track of base.tracks) for(const point of track.points) {
   const row=modal.querySelector(`[data-source-observation="${track.id}:${point.date}"]`);
   assert.ok(row,`${track.id}:${point.date} retains the original sourced checkpoint`);
   assert.ok(row.querySelector(`a[href="${point.sourceUrl}"]`));
  }
  const neo=modal.querySelector('[data-source-observation="neo-documented-lower-bound:2025-01-01"]');
  assert.ok(neo,'New reviewed NEO observation is included as a year-qualified lower bound');
  assert.match(neo.textContent,/At least 32 participants/);
  for(const doi of ['adb88e','ae7694','1994636']) assert.ok([...modal.querySelectorAll('a[data-paper-doi]')].some(a=>a.dataset.paperDoi.includes(doi)&&a.href.startsWith('https://')),'New papers are linked in the chart: '+doi);
  assert.equal(modal.querySelector('[data-frontier-line]'),null,'No connecting pooled/global line');
  assert.ok(window.history.state.atlasModalFrom,'Chart opening must retain its origin for Close/Back/Forward');
 } finally {await cleanup();}
});
