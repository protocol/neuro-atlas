import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
globalThis.React = React;

test('every retained logarithmic preview identifies its scale in the axis title without a generic footer', () => {
  for (const plot of Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots).filter(plot => plot.scale === 'log')) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview: true })));
    try {
      const axis = dom.window.document.querySelector('.draft-plot-axis-title').textContent;
      assert.match(axis, /\blog\b/i, `${plot.id}: logarithmic encoding must remain explicit in the preview axis`);
      assert.equal((axis.match(/\blog\b/gi) ?? []).length, 1, `${plot.id}: do not duplicate an existing log label`);
      assert.equal(dom.window.document.querySelector('.draft-plot-legend'), null);
    } finally { dom.window.close(); }
  }
});
