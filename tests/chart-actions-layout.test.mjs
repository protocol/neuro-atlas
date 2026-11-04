import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { mount, click, settle } from './modal-helpers.mjs';
import { PerformanceCurves, CurveCard } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { ParticipantCommitments } from '../src/components/participant-commitments.tsx';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { DraftTimelinePanel } from '../src/components/draft-chart-panel.tsx';
import { DraftChartShare } from '../src/components/draft-chart-share.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';

globalThis.React = React;
const feed = parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const css = ['performance-curves', 'draft-chart-plot', 'google-trends'].map(name => readFileSync(`src/components/${name}.css`, 'utf8')).join('\n');
const families = [
  ['reference', () => React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '.pc-trigger'],
  ['Pace including latency intro', () => React.createElement(PaceReadings, { data: selectPace(feed) }), '.pc-trigger'],
  ['participants', () => React.createElement(ParticipantCommitments), '.pc-trigger'],
  ['curated numeric and timeline', () => React.createElement(DraftChartsSection), '[data-draft-popout-trigger]'],
  ['Google Trends', () => React.createElement(GoogleTrends), '.pc-trigger'],
  ['supported timeline', () => React.createElement('article', null, React.createElement(DraftTimelinePanel, { timeline: METRIC_CHART_EVIDENCE['Demonstrated applications enabled by connectomics over time'].timeline, anchor: 'metric-panel-application-events' }), React.createElement('div', { 'data-metric-card-footer': true }, React.createElement(DraftChartShare, { anchor: 'metric-panel-application-events', label: 'Selected application events' }))), '[data-draft-popout-trigger]'],
];

function assertActions(modal, supportsImage = true) {
  const rows = modal.querySelectorAll('[data-chart-actions]');
  assert.equal(rows.length, 1, 'Every expanded chart has exactly one shared action row');
  const row = rows[0];
  assert.equal(getComputedStyle(row).display, 'grid', 'The shared actions use one non-wrapping grid, including on narrow screens');
  for (const button of row.querySelectorAll('button')) {
    assert.equal(getComputedStyle(button).gridRow, '1', 'All three full-label buttons stay on the same first row');
    assert.equal(getComputedStyle(button).whiteSpace, 'nowrap');
  }
  for (const message of row.querySelectorAll('[role=status]')) assert.equal(getComputedStyle(message).gridColumn, '1 / -1', 'Messages span below the buttons, never between them');
  const labels = [...row.querySelectorAll('button')].map(button => button.textContent);
  assert.deepEqual(labels, supportsImage ? ['Copy link', 'Copy chart', 'Download PNG'] : ['Copy link']);
  assert.equal(modal.querySelectorAll('button[aria-label^="Copy link"], button[data-copy-chart], button[data-download-chart]').length, labels.length, 'No duplicate or separated chart actions');
  const firstContent = modal.querySelector('.pc-detail');
  // Wrappers are fine, but no plot, scope, intro or methodology may precede the row.
  let node = row;
  while (node !== firstContent) {
    assert.equal(node.previousElementSibling, null, 'Actions immediately follow the modal heading, before all chart content');
    node = node.parentElement;
  }
  return row;
}

for (const [name, component, selector] of families) test(`${name}: every discovered modal keeps chart actions together, first, and in the same order`, async () => {
  const cleanup = await mount(component(), '', win => { const style = win.document.createElement('style'); style.textContent = css; win.document.head.append(style); });
  try {
    const triggers = [...document.querySelectorAll(selector)];
    assert.ok(triggers.length, `${name} inventory must not be empty`);
    for (const trigger of triggers) {
      await click(trigger);
      const modal = document.querySelector('dialog[open]');
      assert.ok(modal);
      assertActions(modal, !!modal.querySelector('svg'));
      assert.ok(trigger.closest('article')?.querySelector('[data-metric-card-footer] button, .draft-chart-share button'), 'Preview Copy link remains available');
      await click(modal.querySelector('.pc-modal-header button'));
      await settle(); await settle();
    }
  } finally { await cleanup(); }
});

test('a chart without an exportable plot retains only its top-row Copy link', async () => {
  const cleanup = await mount(React.createElement(CurveCard, { id: 'no-plot', title: 'No plot', eyebrow: '', coverage: 'Unavailable' }, React.createElement('p', null, 'Evidence unavailable')), '#no-plot', win => { const style = win.document.createElement('style'); style.textContent = css; win.document.head.append(style); });
  try { assertActions(document.querySelector('dialog[open]'), false); }
  finally { await cleanup(); }
});
