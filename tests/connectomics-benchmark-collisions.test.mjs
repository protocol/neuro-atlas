import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
import { brainScaleClock } from './brain-scale-helpers.mjs';
globalThis.React = React;
const plot = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots).find(p => p.id === 'acquisition-economics');
for (const width of [238, 255, 308]) test(`human budget text clears observed annotation badges at ${width}px internal width`, async () => {
  const clock = brainScaleClock(true, width);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }), '', clock.configure);
  try {
    await click(document.querySelector('[data-brain-scale-toggle]'));
    const targets = [...document.querySelectorAll('[data-brain-scale-reference]')].map(line => {
      const text = line.parentElement.querySelector('text');
      const right = Number(text.getAttribute('x')), baseline = Number(text.getAttribute('y'));
      return { left: right - text.textContent.length * 12 * .62, right, top: baseline - 12, bottom: baseline + 3, label: text.textContent };
    });
    for (const badge of document.querySelectorAll('[data-annotation-key] rect')) {
      const left = Number(badge.getAttribute('x')), top = Number(badge.getAttribute('y'));
      const right = left + Number(badge.getAttribute('width')), bottom = top + Number(badge.getAttribute('height'));
      for (const target of targets) {
        const overlapX = Math.min(right, target.right) - Math.max(left, target.left);
        const overlapY = Math.min(bottom, target.bottom) - Math.max(top, target.top);
        assert.ok(overlapX <= 0 || overlapY <= 0, `annotation ${badge.parentElement.dataset.annotationKey} overlaps ${target.label}`);
      }
    }
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});
