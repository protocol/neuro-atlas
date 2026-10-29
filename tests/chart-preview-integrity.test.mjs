import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots ?? []);

test('preview and initially empty modal visibly qualify source-bounded observations', () => {
  for (const plot of plots.filter(p => p.points.some(point => point.qualifier))) {
    for (const preview of [true, false]) {
      const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview })));
      const note = dom.window.document.querySelector('[data-visible-qualifications]');
      assert.ok(note, `${plot.id}: qualification must not depend on inspection or opening sources`);
      assert.equal(note.closest('details, .draft-plot-inspector, [hidden]'), null);
      if (plot.points.every(p => p.qualifier === '≈')) {
        assert.match(note.textContent, /All plotted values are approximate \(≈\)/);
      } else {
        for (const point of plot.points.filter(p => p.qualifier)) {
          const entry = note.querySelector(`[data-qualified-observation="${point.id}"]`);
          assert.ok(entry, point.id);
          assert.ok(entry.textContent.includes(point.label), point.id);
          assert.ok(entry.textContent.includes(point.qualifier), point.id);
          assert.ok(entry.textContent.includes(point.y.toLocaleString('en-US', { maximumFractionDigits: 12 })), point.id);
        }
        assert.ok(note.textContent.includes(plot.yLabel), 'Keep units visible');
      }
      dom.window.close();
    }
  }
});

test('preview SVG keeps native text scale and adopts narrow card width without a fixed-height squeeze', async () => {
  let resize;
  globalThis.ResizeObserver = class { constructor(callback) { resize = callback; } observe() {} disconnect() {} };
  const cleanup = await mount(React.createElement('div', { className: 'draft-popout-preview' }, React.createElement(DraftChartPlot, { plot: plots[0], preview: true })));
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8') + readFileSync('src/components/draft-chart-panel.css', 'utf8');
    document.head.append(style);
    const svg = document.querySelector('.draft-plot-svg');
    assert.equal(getComputedStyle(svg).height, 'auto');
    await act(async () => resize([{ contentRect: { width: 172 } }]));
    assert.equal(Number(svg.getAttribute('viewBox').split(' ')[2]), 172);
    assert.equal(getComputedStyle(svg.querySelector('.draft-plot-tick')).fontSize, '11px');
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});
