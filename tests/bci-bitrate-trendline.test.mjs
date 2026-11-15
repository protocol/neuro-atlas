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

test('the reference trendline comes from traced photo pixels, separately from the 14 study marks', () => {
  assert.ok(source.referenceTrendline, 'Keep replayable source pixels for the original slide trendline');
  assert.equal(source.referenceTrendline.valueBasis, 'visual-digitization');
  const h = source.digitization.homography;
  for (const sample of source.referenceTrendline.samples) {
    const [px, py] = sample.pixel;
    const q = h.map(row => row[0] * px + row[1] * py + row[2]);
    assert.ok(Math.abs(sample.year - (source.digitization.homographyXOriginYear + q[0] / q[2])) < 1e-9);
    assert.ok(Math.abs(sample.bps - 10 ** (q[1] / q[2])) < 1e-9);
  }
  assert.equal(plot.points.length, 14);
  assert.deepEqual(plot.referenceTrendline.points, source.referenceTrendline.displayPoints);
  const samples = source.referenceTrendline.samples;
  const expected = [2000, ...samples.map(sample => sample.year).filter(year => year > 2000 && year < 2025), 2025].map(year => {
    const [a, b] = samples.slice(0, -1).map((a, i) => [a, samples[i + 1]]).find(([a, b]) => a.year <= year && year <= b.year);
    const fraction = (year - a.year) / (b.year - a.year);
    return { x: year, y: 10 ** (Math.log10(a.bps) + fraction * (Math.log10(b.bps) - Math.log10(a.bps))) };
  });
  for (const [i, point] of plot.referenceTrendline.points.entries()) {
    assert.equal(point.x, expected[i].x);
    assert.ok(Math.abs(point.y - expected[i].y) < 1e-12, 'Display line must replay from the recorded trace, not a new fit');
  }
  assert.equal(plot.referenceTrendline.points[0].x, 2000);
  assert.equal(plot.referenceTrendline.points.at(-1).x, 2025);
  assert.match(plot.referenceTrendline.label, /≈.*slide trendline/i);
  assert.match(plot.referenceTrendline.note, /original.*(method|regression).*unavailable/i);
  assert.match(plot.referenceTrendline.note, /visual/i);
  assert.equal(plot.connections, undefined, 'The original trendline is not a connection among study observations');
});

test('preview and expanded plots paint the traced line behind unchanged observations without a confidence band', () => {
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
      assert.match(doc.querySelector('[data-reference-trendline-key]').textContent, /≈.*slide trendline/i);
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
    assert.match(dom.window.document.documentElement.textContent, /≈ Slide trendline/);
    assert.equal(dom.window.document.querySelectorAll('[data-source-observation]').length, 14);
  } finally { dom?.window.close(); await cleanup(); }
});
