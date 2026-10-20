import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
import { mount, click } from './modal-helpers.mjs';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
for (const [id, count] of [['idea_vintage', 27], ['latency_compression', 4]]) test(`${id} shared modal renders exact source years and qualified readings`, async () => {
  assert.ok(existsSync('src/components/pace-readings.tsx'), 'Missing shared pace UI');
  const { PaceReadings } = await import('../src/components/pace-readings.tsx');
  const cleanup = await mount(React.createElement(PaceReadings, { data: selectPace(feed) }), '#' + id);
  try {
    const modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, count);
    assert.equal(modal.querySelectorAll('[data-curve-point]').length, count);
    const source = feed.records.find(r => r.instrument === id);
    for (const p of source.series) assert.ok(modal.querySelector(`[data-source-observation="${id}:${p.x}"]`).textContent.includes(String(p.y)));
    assert.ok(modal.textContent.includes(source.metric));
    assert.ok(modal.textContent.includes(source.measuredAt));
    assert.ok(modal.textContent.includes(source.checkedAt));
    assert.match(modal.textContent, /years/);
    if (id === 'idea_vintage') {
      assert.match(modal.textContent, /Under-indexed/);
      assert.match(modal.textContent, /PatentsView bulk ingestion is not built/);
      assert.equal(modal.querySelectorAll('[data-confidence]').length, 27);
      assert.equal(modal.querySelectorAll('[data-under-indexed="true"]').length, 3);
    } else assert.match(modal.textContent, /sheep/);
    await click(modal.querySelector('button[aria-label^="Close"]'));
    assert.equal(document.querySelector('dialog[open]'), null);
  } finally { await cleanup(); }
});

test('unwired shared records suppress stale values, plots and observation dates', async () => {
  const { PaceReadings } = await import('../src/components/pace-readings.tsx');
  const hidden = structuredClone(feed);
  const record = hidden.records.find(r => r.instrument === 'idea_vintage');
  record.state = 'unwired'; record.candidateMetric = 'A source metric'; record.blocker = 'Needs source export';
  const cleanup = await mount(React.createElement(PaceReadings, { data: selectPace(hidden) }), '#idea_vintage');
  try {
    const modal = document.querySelector('dialog[open]');
    assert.equal(modal.querySelectorAll('[data-curve-point]').length, 0);
    assert.ok(!modal.textContent.includes(record.value));
    assert.ok(!modal.textContent.includes(record.measuredAt));
    assert.match(modal.textContent, /Needs source export/);
  } finally { await cleanup(); }
});

test('Atlas routes render shared pace cards instead of obsolete unwired rows and duplicate roadmap pitches', async () => {
  const source = readFileSync('src/components/sections/velocity-instruments-section.tsx', 'utf8');
  assert.doesNotMatch(source, /title: "The Implant Ledger"|title: "Open Neural Data Hours"|pipelines land next/);
  const page = readFileSync('src/app/field-velocity/page.tsx', 'utf8');
  assert.match(page, /PaceReadings/);
  assert.match(page, /selectPace/);
  assert.doesNotMatch(source, /data\/velocity\/neurotech_records\.json/, 'Do not remount stale local pace rows');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { JSDOM } = await import('jsdom');
  const imported = await import('../src/app/field-velocity/page.tsx');
  const Page = imported.default.default ?? imported.default;
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    for (const id of ['idea_vintage', 'latency_compression']) {
      assert.equal(dom.window.document.querySelectorAll(`[data-performance-card="${id}"]`).length, 1, `${id}: one actual shared pace card`);
    }
  } finally { dom.window.close(); }
});

test('switching from a later pace modal to an earlier performance modal keeps scroll locked', async () => {
  const { PaceReadings } = await import('../src/components/pace-readings.tsx');
  const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
  const cleanup = await mount(React.createElement(React.Fragment, null, React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), React.createElement(PaceReadings, { data: selectPace(feed) })), '#idea_vintage');
  try {
    await act(async () => navigatePerformance('simultaneously-recorded-neurons'));
    assert.equal(document.querySelectorAll('dialog[open]').length, 1);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Close Simultaneously recorded neurons');
  } finally { await cleanup(); }
});
