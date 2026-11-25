import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { FieldVelocityRouteContext } from '../src/components/field-velocity-route-context.ts';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import SNAPSHOT from '../src/data/field-velocity/neurotech.snapshot.json';
import PROVENANCE from '../src/data/field-velocity/neurotech.snapshot.json.provenance.json';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage, chartShareUrl } from '../src/lib/chart-export.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(chart => chart.plots);
const pathfinder = fieldVelocityGraph('metric-panel-pathfinder-nerl');
const recording = fieldVelocityGraph('neural-recording-hours');
const t15 = 'braingate-t15-independent-use-2026-06-15';
const standalone = (entry, search = '') => mount(React.createElement(FieldVelocityGraphDetail, { entry }), '', win => {
  win.history.replaceState({}, '', `/field-velocity/${entry.slug}${search}`);
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});

test('PATHFINDER preview help survives both the exploration dialog and dedicated-page link branches', () => {
  const panel = React.createElement(DraftChartPanel, { plot: plots.find(plot => plot.id === 'pathfinder-nerl'), anchor: pathfinder.target });
  for (const current of [null, 'https://atlas.example/field-velocity/bci-information-transfer-over-time']) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(FieldVelocityRouteContext.Provider, { value: current }, panel)));
    try {
      const trigger = dom.window.document.querySelector('[data-draft-popout-trigger]');
      assert.equal(trigger.tagName, current ? 'A' : 'BUTTON');
      assert.match(trigger.title, /ERL stands for expected run length/);
      if (current) assert.equal(new URL(trigger.getAttribute('href'), current).pathname, `/field-velocity/${pathfinder.slug}`);
      else assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    } finally { dom.window.close(); }
  }
});

test('standalone PATHFINDER preserves the current-main axis explanation and keyboard help', async () => {
  const close = await standalone(pathfinder);
  try {
    const axisDefinition = [...document.querySelectorAll('[data-draft-methodology] dt')].find(node => node.textContent === 'Axes').nextElementSibling;
    assert.match(axisDefinition.textContent, /y-axis: Normalized expected run length \(%\)/);
    assert.match(axisDefinition.textContent, /50%.*half the ideal/);
    assert.match(axisDefinition.textContent, /94\.2%.*close to ideal/);
    assert.match(axisDefinition.textContent, /100% meets the benchmark’s error-free tracing criterion/);
    assert.match(axisDefinition.textContent, /smaller errors outside its evaluation rules may remain/);
    const axis = document.querySelector('[data-erl-axis-help]');
    assert.ok(axis);
    await act(async () => axis.focus());
    assert.match(document.querySelector('[role="tooltip"]').textContent, /ERL stands for expected run length/);
    await act(async () => axis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    assert.equal(document.querySelectorAll('svg [data-source-observation]').length, 1);
    assert.match(document.querySelector('svg [data-source-observation]').getAttribute('aria-label'), /94\.2/);
    assert.equal(document.querySelector('dialog, .pc-preview'), null);
  } finally { await close(); }
});

test('standalone recording-hours retains the new BrainGate observation, exact scientific JSON and one source scope', async () => {
  const source = plots.find(plot => plot.id === 'recording-hours');
  const point = source.points.find(point => point.id === t15);
  assert.ok(point, 'Current main BrainGate T15 addition must remain in the standalone evidence');
  const close = await standalone(recording);
  try {
    assert.equal(document.querySelectorAll(`svg [data-source-observation="${t15}"]`).length, 1);
    assert.match(document.querySelector(`[data-recording-coverage-row="${t15}"]`).textContent, /≈3,800 h · 1 participant/);
    const download = document.querySelector('[data-selected-plot-json]');
    assert.ok(download, 'Recording coverage alone makes the selected-data download eligible');
    const selected = JSON.parse(decodeURIComponent(download.getAttribute('href').split(',')[1]));
    assert.deepEqual(selected.points, source.points, 'Preserve every observation, qualifier, source and privacy caveat');
    assert.deepEqual(selected.points.find(point => point.id === t15), point);
    assert.equal(document.querySelectorAll('[data-draft-sources-scope], .draft-plot-data .draft-plot-scope').length, 1);
    const spec = (await whenChartRegistered(recording.target)).getChart();
    assert.ok(spec.pointKey.find(entry => entry.pointId === t15));
    assert.equal(spec.pointKey.length, source.points.length);
    const image = buildChartImage(spec, window.location.href);
    assert.equal(new URL(image.url).pathname, `/field-velocity/${recording.slug}`);
    assert.equal(new URL(image.url).hash, '');
    const output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    try {
      const exported = output.window.document;
      assert.equal(exported.querySelectorAll('[data-source-observation]').length, source.points.length);
      assert.match(exported.querySelector(`[data-export-point-id="${t15}"]`).textContent, /≈3,800 h · 1 participant/);
      assert.match(exported.querySelector('desc').textContent, /session data were saved except during privacy mode/);
      assert.match(exported.querySelector('desc').textContent, /neural data and transcripts are non-public/);
    } finally { output.window.close(); }
    assert.equal(document.querySelector('[data-extrapolation-line], [data-exploration-fit-line], dialog'), null);
  } finally { await close(); }
});

test('approved acquisition legend copy retains the existing em URL token, filtering and fresh-link restoration', async () => {
  const entry = fieldVelocityGraph('metric-panel-acquisition-economics');
  const source = plots.find(plot => plot.id === 'acquisition-economics');
  const em = point => point.group !== 'Expansion microscopy' && !['peem2024', 'mesospim2024'].includes(point.id);
  const remaining = source.points.filter(point => !em(point)).map(point => point.id);
  const marks = () => [...document.querySelectorAll('svg [data-source-observation]')].map(node => node.dataset.sourceObservation);
  const legendButton = () => [...document.querySelectorAll('[data-exploration-series]')].find(node => node.textContent.includes('EM · reported-technology estimates'));
  let close = await standalone(entry);
  let shared;
  try {
    const table = document.querySelector('.draft-plot-data table').textContent;
    const original = document.querySelector('[data-source-plot-json]').getAttribute('href');
    await click(legendButton());
    assert.equal(new URL(window.location.href).searchParams.get('chartHidden'), `${entry.slug}:em`);
    assert.deepEqual(marks(), remaining, 'The renamed legend still filters exactly the EM observations');
    assert.equal(legendButton().getAttribute('aria-pressed'), 'false');
    assert.equal(document.querySelector('.draft-plot-data table').textContent, table);
    assert.equal(document.querySelector('[data-source-plot-json]').getAttribute('href'), original);
    shared = new URL(chartShareUrl(window.location.href, entry.target));
  } finally { await close(); }
  close = await standalone(entry, shared.search);
  try {
    assert.deepEqual(marks(), remaining, 'Published em query tokens retain their exact selected view after reload');
    assert.equal(legendButton().getAttribute('aria-pressed'), 'false');
    await click(legendButton());
    assert.deepEqual(marks(), source.points.map(point => point.id));
    assert.equal(new URL(window.location.href).searchParams.has('chartHidden'), false);
  } finally { await close(); }
});

test('PaceReadings keeps the standalone detail branch and current-main unavailable-reading copy', () => {
  const data = {
    definitions: [{ id: 'idea_vintage', label: 'Citation latency', description: 'Reference age.' }],
    records: [{ instrument: 'idea_vintage', state: 'pending' }],
  };
  for (const detail of [false, true]) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(PaceReadings, { data, detail, flat: true })));
    try {
      if (detail) {
        assert.ok(dom.window.document.querySelector('.pc-methodology'));
        assert.equal(dom.window.document.querySelector('.pc-card, .pc-preview'), null);
      } else assert.equal(dom.window.document.querySelector('.pc-coverage').textContent, 'Reading unavailable');
    } finally { dom.window.close(); }
  }
});

test('current-main scenario wording composes with the standalone guard against unpersisted growth controls', async () => {
  let close = await standalone(recording, `?chartModel=${recording.slug}:fit`);
  try {
    assert.match(document.querySelector('[data-scenario-warning]').textContent, /^TUSZ corpus-only scenario\./);
    assert.ok(document.querySelector('[data-extrapolation-line]'));
    assert.equal(document.querySelector('[data-scenario-select]'), null, 'Standalone compatibility view exposes only URL-restorable assumptions');
  } finally { await close(); }
  close = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(SNAPSHOT), provenance: PROVENANCE, selection: [recording.target], flat: true }), '#neural-recording-hours', win => {
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  });
  try {
    const dialog = document.querySelector('dialog[open]');
    await click(dialog.querySelector('[role="switch"]'));
    assert.match(dialog.querySelector('[data-scenario-warning]').textContent, /^TUSZ corpus-only scenario\./);
    assert.equal(dialog.querySelector('.pc-scenario-select span').textContent, 'Alternative growth assumptions');
    assert.ok(dialog.querySelector('[data-scenario-select]'), 'Embedded legacy view retains its local growth control');
  } finally { await close(); }
});
