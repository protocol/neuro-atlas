import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { recordingAverages } from '../src/data/recording-hours-coverage.ts';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const plot = METRIC_CHART_EVIDENCE['Neural recording hours collected over time'].plots[0];

test('recording averages use one decimal and minutes below one hour, with conservative lower bounds', () => {
  const earlier = plot.points.find(p => p.id === 'tusz-scalp-eeg-2017-08-04');
  const latest = plot.points.find(p => p.id === 'tusz-scalp-eeg-2020-05-09');
  assert.equal(recordingAverages(earlier), 'Calculated average: ≈1.7 h/patient · ≈37.2 min/session');
  assert.equal(recordingAverages(latest), 'Calculated average: ≈1.6 h/patient · ≈24.7 min/session');
  const single = { ...latest, recordingCoverage: { ...latest.recordingCoverage, count: 1, sessions: 1 } };
  assert.match(recordingAverages({ ...single, y: 0.5 }), /≈30\.0 min\/patient · ≈30\.0 min\/session/);
  assert.match(recordingAverages({ ...single, y: 1 }), /≈1\.0 h\/patient · ≈1\.0 h\/session/);
  assert.match(recordingAverages({ ...single, y: 1.04 }), /≈1\.0 h\/patient · ≈1\.0 h\/session/);
  assert.match(recordingAverages({ ...single, y: 1, qualifier: '>', recordingCoverage: { ...single.recordingCoverage, count: 7 } }), />8\.5 min\/patient/);
  assert.match(recordingAverages(plot.points.find(p => p.id.startsWith('poyo-'))), />14\.2 h\/animal.*both values are lower bounds/);
});

test('each bar identifies its metric in the UI and PNG; equal patient counts retain equal bars despite different session averages', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: 'metric-recording-hours' }));
  let out;
  try {
    const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
    const selected = plot.points.filter(p => ['tusz-scalp-eeg-2019-07-22', 'tusz-scalp-eeg-2020-04-23', 'tusz-scalp-eeg-2020-05-09'].includes(p.id));
    assert.deepEqual(selected.map(p => p.recordingCoverage.count), [692, 692, 692]);
    assert.equal(new Set(selected.map(p => p.recordingCoverage.sessions)).size, 3);
    for (const p of selected) {
      const row = document.querySelector(`[data-recording-coverage-row="${p.id}"]`);
      assert.deepEqual([...row.querySelectorAll('[data-recording-bar-label]')].map(e => e.textContent), ['Recording hours', 'Patient count']);
      assert.equal(row.querySelector('[data-recording-bar="contributors"] [data-recording-bar-fill]').style.width, '100%');
      const key = spec.pointKey.find(k => k.pointId === p.id);
      assert.deepEqual(key.barLabels, ['Recording hours', 'Patient count']);
      assert.equal(key.bars[1].fraction, 1);
    }
    assert.match(document.querySelector('[data-recording-coverage-list]').textContent, /equal contributor counts.*equal bars/i);
    const image = buildChartImage(spec, window.location.href);
    out = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    for (const p of selected) {
      const key = out.window.document.querySelector(`[data-export-point-id="${p.id}"]`);
      assert.deepEqual([...key.querySelectorAll('[data-export-bar-label]')].map(e => e.textContent), ['Recording hours', 'Patient count']);
      assert.match(key.textContent, /≈1\.6 h\/patient/);
      assert.match(key.textContent, /min\/session/);
    }
    assert.deepEqual(spec.pointKey.find(k => k.pointId.startsWith('poyo-')).barLabels, ['Recording hours', 'Animal count']);
    assert.deepEqual(spec.pointKey.find(k => k.pointId.startsWith('japaneeg-')).barLabels, ['Recording hours', 'Participant count']);
  } finally { out?.window.close(); await cleanup(); }
});
