import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { buildChartImage } from '../src/lib/chart-export.ts';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('every Metrics pop-out puts actions beside Close, reading beside sources, and source tables in a closed full-width row', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const anchors = [...document.querySelectorAll('[data-copy-card-png]')].map(button => button.dataset.copyCardPng);
    assert.ok(anchors.length >= 20);
    for (const anchor of anchors) {
      await act(async () => { window.location.hash = anchor; window.dispatchEvent(new window.HashChangeEvent('hashchange')); });
      const modal = document.querySelector('dialog[open]');
      assert.ok(modal, anchor);
      const header = modal.querySelector('.pc-modal-header');
      assert.equal(header.querySelector('button'), header.querySelector('.pc-modal-close'), `${anchor}: Close is the first header control`);
      assert.equal(header.querySelector('.pc-modal-close svg'), null, 'The close cross is CSS-drawn, adding no SVG to the chart dialog');
      assert.ok(header.querySelector('.mx-actions [data-chart-actions]'), `${anchor}: actions sit in the header row`);
      assert.ok(modal.querySelector('.mx-sources > *'), `${anchor}: a Sources & data column is populated`);
      for (const details of modal.querySelectorAll('.mx-data > details')) assert.equal(details.open, false, `${anchor}: data tables start closed`);
      assert.equal(modal.querySelector('.pc-detail .chart-actions'), null, `${anchor}: no action row left inside the body`);
      await act(async () => modal.querySelector('.pc-modal-close').click());
    }
  } finally { await cleanup(); }
});

test('draft pop-outs list each plotted source once in the Sources & data column', async () => {
  const cleanup = await mount(React.createElement(Page), '#metric-recording-hours');
  try {
    const modal = document.querySelector('dialog[open]');
    const sources = [...modal.querySelectorAll('.mx-sources .pc-sources a')].map(link => link.href);
    const rows = [...new Set([...modal.querySelectorAll('.mx-data tbody td a')].map(link => link.href))];
    assert.deepEqual(sources, rows, 'One link per distinct source, in table order');
    assert.ok(modal.querySelector('.mx-sources [data-draft-sources-scope]')?.textContent.trim());
  } finally { await cleanup(); }
});

test('drag across a line chart reads the change between two plotted points, then a plain click clears it', async () => {
  const cleanup = await mount(React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] }), '#google-trends-neurotech', window => {
    // Identity screen transform: client coordinates equal SVG units.
    window.SVGElement.prototype.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    window.SVGElement.prototype.setPointerCapture = () => {};
    window.SVGElement.prototype.hasPointerCapture = () => false;
  });
  try {
    const modal = document.querySelector('dialog[open]');
    const svg = modal.querySelector('.gt-plot svg');
    assert.ok(modal.querySelector('[data-chart-measure-hint]'), 'A hint names the gesture');
    const before = buildChartImage({ svg, title: 'Trends', anchor: 'google-trends-neurotech', notes: [] }, window.location.href).svg;
    const pointer = (type, x) => svg.dispatchEvent(new window.PointerEvent(type, { bubbles: true, clientX: x, clientY: 120, button: 0, pointerId: 1, isPrimary: true }));
    await act(async () => { pointer('pointerdown', 100); pointer('pointermove', 300); pointer('pointermove', 500); pointer('pointerup', 500); });
    const readout = modal.querySelector('[data-chart-measure]');
    assert.ok(readout, 'Dragging shows a readout');
    assert.match(readout.textContent, /→/);
    assert.match(readout.textContent, /neurotechnology/);
    assert.match(readout.textContent, /brain-computer interface/);
    assert.ok(svg.querySelector('.chart-measure[data-export-exclude]'), 'The band is drawn in the SVG but excluded from exports');
    assert.equal(buildChartImage({ svg, title: 'Trends', anchor: 'google-trends-neurotech', notes: [] }, window.location.href).svg, before, 'Measuring never changes the exported PNG');
    await act(async () => { pointer('pointerdown', 200); pointer('pointerup', 200); });
    assert.equal(modal.querySelector('[data-chart-measure]'), null, 'A plain click clears the measurement');
  } finally { await cleanup(); }
});

test('the card preview of publication growth shows rows only; the expanded chart keeps its frozen axis', () => {
  const source = readFileSync('src/components/publication-charts.tsx', 'utf8');
  const preview = source.slice(source.indexOf('function GrowthPreview'), source.indexOf('function GrowthPlot'));
  assert.doesNotMatch(preview, /data-growth-sticky-axis/);
  assert.match(source.slice(source.indexOf('function GrowthPlot')), /data-growth-sticky-axis/);
});
