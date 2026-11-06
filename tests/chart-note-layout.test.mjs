import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
globalThis.React = React;

test('the actual recording-hours site notes separate five source paragraphs with existing legend color keys', async () => {
  const plot = METRIC_CHART_EVIDENCE['Neural recording hours collected over time'].plots[0];
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: 'metric-recording-hours' }));
  try {
    const rows = [...document.querySelectorAll('[data-chart-note]')];
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map(row => row.querySelector('p').textContent), plot.seriesNote.split(/\n\n/));
    assert.deepEqual(rows.map(row => row.querySelector('[data-chart-note-key]').style.backgroundColor), plot.legend.map(entry => {
      const node = document.createElement('span'); node.style.backgroundColor = entry.color; return node.style.backgroundColor;
    }));
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 12, 'Source marks are not restyled or removed');
    const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    assert.match(css, /\.chart-supporting-notes\s*\{[^}]*font-size:\s*12px/);
    assert.match(css, /\.chart-supporting-notes\s*\{[^}]*color:\s*var\(--muted\)/);
  } finally { await cleanup(); }
});

test('reference-chart dataset definitions use separate rows keyed to the exact existing legend', async () => {
  const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
  const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#tissue-mapped');
  try {
    const rows = [...document.querySelectorAll('dialog [data-track-note]')];
    const legend = [...document.querySelectorAll('dialog .pc-legend li')];
    assert.ok(rows.length > 1, 'The real multitrack chart has separate dataset explanations');
    assert.equal(rows.length, legend.length);
    rows.forEach((row, index) => {
      assert.equal(row.querySelector('dt').textContent, legend[index].textContent);
      assert.equal(row.querySelector('[data-track-note-key]').style.backgroundColor, legend[index].querySelector('span').style.backgroundColor || legend[index].querySelector('span').style.background);
      assert.ok(row.querySelector('dd').textContent.length > 0);
    });
  } finally { await cleanup(); }
});
