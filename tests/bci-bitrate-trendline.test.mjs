import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { BCI_BITRATE_EVIDENCE } from '../src/data/bci-bitrate.ts';
import { mount } from './modal-helpers.mjs';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';

globalThis.React = React;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
const source = JSON.parse(readFileSync(new URL('../src/data/bci-bitrate.source.json', import.meta.url), 'utf8'));

test('the earlier source trace stays archived and replayable', () => {
  assert.equal(source.referenceTrendline.valueBasis, 'visual-digitization');
  const h = source.digitization.homography;
  for (const sample of source.referenceTrendline.samples) {
    const [px, py] = sample.pixel;
    const q = h.map(row => row[0] * px + row[1] * py + row[2]);
    assert.ok(Math.abs(sample.year - (source.digitization.homographyXOriginYear + q[0] / q[2])) < 1e-9);
    assert.ok(Math.abs(sample.bps - 10 ** (q[1] / q[2])) < 1e-9);
  }
});

test('the visible line is an equal-weight log-linear fit to all 14 approximate observations, not the archived trace', async () => {
  const imported = await import('../src/data/bci-bitrate.ts');
  const model = imported.BCI_BITRATE_FIT ?? imported.default?.BCI_BITRATE_FIT;
  assert.ok(model, 'Expose the actual fitted model and diagnostic basis');
  assert.equal(model.n, 14);
  assert.equal(model.xOrigin, 2000);
  assert.ok(Math.abs(model.interceptLog10 - (-0.9357557362966622)) < 1e-12);
  assert.ok(Math.abs(model.slopeLog10PerX - 0.060226873134295214) < 1e-12);
  assert.ok(Math.abs(model.rSquaredLog10 - 0.46008243809440696) < 1e-12);
  const xs = plot.points.map(p => p.x), logs = plot.points.map(p => Math.log10(p.y));
  const meanX = xs.reduce((a,b)=>a+b,0)/14, meanLog = logs.reduce((a,b)=>a+b,0)/14;
  const residuals = plot.points.map(p => Math.log10(p.y) - model.interceptLog10 - model.slopeLog10PerX * (p.x - model.xOrigin));
  assert.ok(Math.abs(residuals.reduce((a,b)=>a+b,0)) < 1e-12, 'Unconstrained OLS has zero mean log residual');
  assert.ok(Math.abs(residuals.reduce((a,b,i)=>a+b*(xs[i]-meanX),0)) < 1e-10, 'Residuals orthogonal to centered years');
  const total = logs.reduce((a,b)=>a+(b-meanLog)**2,0), residual = residuals.reduce((a,b)=>a+b*b,0);
  assert.ok(Math.abs(model.rSquaredLog10 - (1-residual/total)) < 1e-12);
  assert.deepEqual(plot.referenceTrendline.points, model.points);
  assert.notDeepEqual(plot.referenceTrendline.points, source.referenceTrendline.displayPoints);
  assert.deepEqual(model.points.map(p=>p.x), [2000,2025]);
  assert.match(plot.referenceTrendline.label, /log-linear fit.*14 approximate/i);
  assert.match(plot.referenceTrendline.note, /equal.weight.*log10/i);
  assert.match(plot.referenceTrendline.note, /R².*0\.46/);
  assert.equal(plot.points.length,14);
  assert.deepEqual(plot.points.map(p=>[p.id,p.x,p.y]),source.observations.map(p=>[p.id,p.slideYear,p.approximateBps]));
  assert.equal(plot.connections,undefined);
});

test('preview and expanded plots paint the fitted line behind unchanged observations without a confidence band', () => {
  for (const preview of [true, false]) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview })));
    try {
      const doc = dom.window.document;
      const line = doc.querySelector('[data-reference-trendline="bci-bitrate"]');
      assert.ok(line);
      assert.equal(line.getAttribute('fill'), 'none');
      assert.equal(line.getAttribute('pointer-events'), 'none');
      assert.equal(line.getAttribute('stroke'), plot.referenceTrendline.color);
      assert.equal(line.getAttribute('points').split(' ').length, plot.referenceTrendline.points.length);
      const first = doc.querySelector('[data-source-observation]');
      assert.ok(line.compareDocumentPosition(first) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'Draw underneath study marks');
      assert.equal(doc.querySelectorAll('[data-source-observation]').length, 14);
      assert.equal(doc.querySelectorAll('[data-confidence-band]').length, 0);
      assert.match(doc.querySelector('[data-reference-trendline-key]').textContent, /log-linear fit.*14 approximate/i);
    } finally { dom.window.close(); }
  }
});

test('native chart export preserves the reference stroke and a visibly qualified line key', async () => {
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: 'metric-panel-bci-bitrate' }), '#bci-information-transfer-over-time');
  let dom;
  try {
    const registration = await whenChartRegistered('metric-panel-bci-bitrate');
    const spec = registration.getChart();
    assert.ok(spec.legend.some(entry => entry.marker === 'line' && entry.label === plot.referenceTrendline.label));
    assert.ok(spec.notes.includes(plot.referenceTrendline.note));
    const stroke = spec.svg.querySelector('[data-reference-trendline]').getAttribute('points');
    dom = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
    assert.ok([...dom.window.document.querySelectorAll('polyline')].some(e => e.getAttribute('points') === stroke));
    assert.match(dom.window.document.documentElement.textContent, /Log-linear fit/);
    assert.equal(dom.window.document.querySelectorAll('[data-source-observation]').length, 14);
  } finally { dom?.window.close(); await cleanup(); }
});
