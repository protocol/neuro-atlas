import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const plot = Object.values(METRIC_CHART_EVIDENCE).flatMap(chart => chart.plots).find(plot => plot.id === 'pathfinder-nerl');

test('PATHFINDER axis reveals the full ERL name on hover, focus and tap without changing observations', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    const axis = document.querySelector('[data-erl-axis-help]');
    assert.ok(axis, 'ERL axis needs an discoverable explanation');
    assert.equal(axis.getAttribute('tabindex'), '0');
    assert.match(axis.getAttribute('aria-label'), /expected run length/i);
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'No unsolicited popup on load');
    await act(async () => axis.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })));
    assert.match(document.querySelector('[role="tooltip"]').textContent, /ERL stands for expected run length/);
    await act(async () => axis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await act(async () => { axis.blur(); axis.focus(); });
    assert.equal(document.activeElement, axis);
    assert.match(document.querySelector('[role="tooltip"]').textContent, /expected run length/);
    await act(async () => axis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => axis.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.match(document.querySelector('[role="tooltip"]').textContent, /expected run length/);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 1);
    assert.match(document.querySelector('[data-source-observation]').getAttribute('aria-label'), /94\.2/);
  } finally { await cleanup(); }
});

test('PATHFINDER Axes spells out the measure and explains 50%, 94.2% and a rule-qualified 100%', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection, { flat: true, category: 'Cost and automation' }), '#pathfinder-v1-axon-tracing-benchmark');
  try {
    const axes = Array.from(document.querySelectorAll('dialog[open] dt')).find(el => el.textContent === 'Axes')?.nextElementSibling?.textContent;
    assert.match(axes ?? '', /y-axis: Normalized expected run length \(%\)/);
    assert.match(axes, /50%.*half the ideal/);
    assert.match(axes, /94\.2%.*close to ideal/);
    assert.match(axes, /100% is possible/);
    assert.match(axes, /evaluation rules/);
    assert.match(axes, /[Mm]inor errors.*may remain/);
    const preview = document.querySelector('button[aria-label="Enlarge PATHFINDER v1: axon tracing benchmark"]');
    assert.match(preview.title, /ERL stands for expected run length/);
    const dialog = document.querySelector('dialog[open]');
    const axis = dialog.querySelector('[data-erl-axis-help]');
    for (const key of ['Enter', ' ']) {
      await act(async () => axis.focus());
      await act(async () => axis.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      assert.match(dialog.querySelector('[role="tooltip"]').textContent, /expected run length/);
      await act(async () => axis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
      assert.equal(dialog.querySelector('[role="tooltip"]'), null);
      assert.equal(dialog.open, true, 'First Escape dismisses axis help, not the enclosing chart');
    }
  } finally { await cleanup(); }
});

test('ERL help adds no controls to previews and leaves other chart labels alone', () => {
  const preview = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview: true }))).window.document;
  assert.equal(preview.querySelector('button, [tabindex], [role="button"], [role="tooltip"]'), null);
  const other = Object.values(METRIC_CHART_EVIDENCE).flatMap(chart => chart.plots).find(plot => plot.id === 'proofreading-effort');
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: other }))).window.document;
  assert.equal(doc.querySelector('[data-erl-axis-help]'), null);
  assert.match(doc.querySelector('.draft-plot-axis-title').textContent, /Person-years/);
});
