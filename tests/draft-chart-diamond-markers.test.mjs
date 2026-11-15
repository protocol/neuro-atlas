import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { mount } from './modal-helpers.mjs';
import { buildChartImage } from '../src/lib/chart-export.ts';

globalThis.React = React;
// Real source coordinates and provenance; the only test variation is marker presentation.
const source = DRAFT_CHART_EVIDENCE['Brain tissue mapped over time'].plots[0];
const observation = source.points[0];
const plotWith = marker => ({
  ...source,
  points: source.points.map(point => point.id === observation.id ? { ...point, marker } : point),
  legend: [{ label: observation.group ?? observation.label, color: observation.color ?? '#115ef7', marker }],
});
const mark = document => document.querySelector(`[data-source-observation="${observation.id}"]`);
const vertices = node => node.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));

test('opt-in diamonds preserve real source centers and circumradii in native previews, expanded plots and legends', () => {
  const before = JSON.stringify(source);
  for (const preview of [true, false]) {
    const baseline = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: plotWith('circle'), preview })));
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: plotWith('diamond'), preview })));
    try {
      const circle = mark(baseline.window.document);
      const diamond = mark(dom.window.document);
      assert.equal(diamond.tagName, 'polygon', 'A requested diamond must not fall back to a circle');
      const points = vertices(diamond);
      assert.equal(points.length, 4);
      const [cx, cy, r] = ['cx', 'cy', 'r'].map(key => Number(circle.getAttribute(key)));
      assert.deepEqual(points, [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], 'The four tips share the unchanged source center and circumradius');
      assert.equal(diamond.getAttribute('fill'), circle.getAttribute('fill'));
      assert.equal(diamond.getAttribute('stroke'), circle.getAttribute('stroke'));
      assert.equal(diamond.closest('[transform]'), null, 'No source-coordinate jitter');
      const legend = dom.window.document.querySelector('[data-draft-group-legend] svg polygon');
      assert.ok(legend, 'The legend uses the same diamond glyph');
      assert.deepEqual(vertices(legend), [[7, 1], [13, 7], [7, 13], [1, 7]]);
      assert.equal(dom.window.document.querySelector('[role=tooltip]'), null);
    } finally { baseline.window.close(); dom.window.close(); }
  }
  assert.equal(JSON.stringify(source), before, 'No scientific records are mutated');
});

test('diamond source marks retain keyboard inspection and Escape clearing without a resting popover', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: plotWith('diamond') }));
  try {
    const diamond = mark(document);
    assert.equal(diamond.tagName, 'polygon');
    assert.equal(diamond.getAttribute('tabindex'), '0');
    assert.equal(diamond.getAttribute('role'), 'button');
    assert.equal(document.querySelector('[role=tooltip]'), null);
    await act(async () => diamond.focus());
    assert.equal(document.querySelector('[role=tooltip] a').href, observation.sourceUrl);
    await act(async () => diamond.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role=tooltip]'), null);
  } finally { await cleanup(); }
});

test('native branded exports retain both diamond source marks and a matching diamond legend', () => {
  const plot = plotWith('diamond');
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  let output;
  try {
    const svg = dom.window.document.querySelector('svg.draft-plot-svg');
    const before = svg.outerHTML;
    const image = buildChartImage({ svg, title: plot.title, anchor: 'metric-panel-bci-bitrate', legend: plot.legend, notes: [plot.scope] }, 'https://atlas.example/neuro-atlas/field-velocity');
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const legend = [...doc.documentElement.children].find(node => node.localName === 'polygon');
    assert.ok(legend, 'Diamond legend must not silently export as a circle');
    const points = vertices(legend);
    assert.equal(points.length, 4);
    assert.equal(points[0][0], points[2][0]);
    assert.equal(points[1][1], points[3][1]);
    assert.equal(mark(doc).localName, 'polygon');
    assert.equal(mark(doc).getAttribute('points'), mark(dom.window.document).getAttribute('points'));
    assert.equal(image.url, 'https://atlas.example/neuro-atlas/field-velocity#bci-information-transfer-over-time');
    assert.equal(doc.querySelector('[data-export-signature]').getAttribute('fill'), '#115EF7');
    assert.ok(doc.querySelector('[data-export-brand="pl-rd"]'));
    assert.equal(svg.outerHTML, before, 'Native export does not modify the original plot');
  } finally { output?.window.close(); dom.window.close(); }
});
