import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const title = 'Open-access connectomics data over time';
const plot = () => METRIC_CHART_EVIDENCE[title].plots[0];

test('MICrONS v117 has its own July 2021 public image-product observation', () => {
  const point = plot().points.find(point => point.id === 'microns-v117-public-images-2021');
  assert.ok(point, 'The release manifest must be represented separately from the 2025 report');
  assert.equal(point.x, 2021);
  assert.equal(point.y, (117 + 55) / 1_000);
  assert.equal(point.qualifier, '≈');
  assert.match(point.dateLabel, /^2021-07 · first public release \(month precision\)/);
  assert.match(point.sourceUrl, /microns-explorer.org\/manifests\/mm3-v117$/);
  assert.match(point.quote, /first public data released.*July 2021/);
  assert.match(point.note, /117 TB.*55 TB.*172 TB/);
  assert.match(point.note, /same specimen/);
  assert.match(point.note, /mirror/);
  assert.match(point.annotation, /MICrONS.*2021.*0.172 PB/);
});

test('later reports and measurements retain every archived value, date and source', () => {
  const raw = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'))[title].plots[0];
  assert.equal(raw.points.length, 6, 'Historical archive stays intact');
  assert.equal(plot().points.length, 7);
  for (const original of raw.points) {
    const current = plot().points.find(point => point.id === original.id);
    for (const field of ['id', 'x', 'y', 'quote', 'sourceUrl', 'sourceTitle', 'qualifier']) {
      assert.deepEqual(current[field], original[field], `${original.id}: ${field}`);
    }
  }
  assert.equal(plot().points.find(point => point.id === 'microns-2025-size').x, 2025);
  assert.equal(plot().points.find(point => point.id === 'microns-2025-size').y, 1.6);
  const male = plot().points.find(point => point.id === 'malecns-jpeg-inventory-2026');
  assert.equal(male.x, 2026);
  assert.equal(male.y, 50_910_260_068_834 / 10**15);
  assert.match(male.dateLabel, /2026-11-03/);
  assert.equal(plot().points.find(point => point.id === 'h01-2021').x, 2021);
  assert.equal(plot().xLabel, 'Release / report / measurement year');
  assert.match(plot().seriesNote, /H01.*June 1, 2021.*1.4 PB/);
  assert.match(plot().seriesNote, /MICrONS.*July 2021/);
});

test('preview and detail show both MICrONS checkpoints with separate source-table identity', () => {
  for (const preview of [true, false]) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, {plot: plot(), preview})));
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelectorAll('[data-source-observation]').length, 7);
      for (const id of ['microns-v117-public-images-2021', 'microns-2025-size', 'malecns-jpeg-inventory-2026']) {
        assert.equal(doc.querySelectorAll(`[data-source-observation="${id}"]`).length, 1);
      }
      if (!preview) {
        assert.equal(doc.querySelectorAll('tbody tr').length, 7);
        assert.match(doc.querySelector('tbody').textContent, /2021-07 · first public release/);
        assert.match(doc.querySelector('tbody').textContent, /2025-04-09.*report/);
        assert.match(doc.querySelector('tbody').textContent, /2026-11-03.*measured/);
      }
    } finally { dom.window.close(); }
  }
});
