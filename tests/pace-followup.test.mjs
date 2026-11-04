import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));

test('latency sources are directly available on the preview without opening or hovering the chart', async () => {
 const cleanup=await mount(React.createElement(PaceReadings,{data:selectPace(feed),flat:true}));
 try {
  const card=document.querySelector('[data-performance-card="latency_compression"]');
  const source=card.querySelector('[data-curve-source-link]');
  assert.ok(source,'Expose a direct source link outside the chart-open control');
  assert.equal(source.closest('button'),null);
  assert.equal(source.target,'_blank');
  assert.match(source.href,/^https:\/\//);
  assert.equal(document.querySelector('dialog[open]'),null);
 } finally {await cleanup();}
});

test('Citation latency replaces the visible Idea vintage label while retaining its chart URL and source observations', async () => {
  const cleanup = await mount(React.createElement(PaceReadings, { data: selectPace(feed), flat: true }), '#idea_vintage');
  try {
    const card = document.querySelector('[data-performance-card="idea_vintage"]');
    assert.equal(card.querySelector('.pc-card-title').textContent, 'Citation latency');
    const modal = document.querySelector('dialog[open]');
    assert.equal(modal.querySelector('h2').textContent, 'Citation latency');
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, 27);
    assert.equal(window.location.hash, '#idea_vintage');
    assert.doesNotMatch(modal.querySelector('[data-copy-chart]').getAttribute('aria-label'), /Idea vintage/);
  } finally { await cleanup(); }
});
