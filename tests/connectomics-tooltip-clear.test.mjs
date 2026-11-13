import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
import { brainScaleClock } from './brain-scale-helpers.mjs';
globalThis.React = React;
for (const id of ['public-data-size','acquisition-economics']) test(`${id}: switching scale clears a pinned source popup without returning focus to a moving mark`, async () => {
  const plot = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots).find(p => p.id === id);
  const clock = brainScaleClock(true);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }), '', clock.configure);
  try {
    const mark = document.querySelector('[data-source-observation]');
    await act(async () => mark.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.ok(document.querySelector('[data-point-tooltip]'));
    const toggle = document.querySelector('[data-brain-scale-toggle]');
    await act(async () => toggle.focus());
    await click(toggle);
    assert.equal(!!document.querySelector('[data-point-tooltip]'), false);
    assert.equal(document.activeElement, toggle);
    assert.equal(document.querySelector('[data-source-observation][aria-describedby]'), null);
  } finally { await cleanup(); }
});
