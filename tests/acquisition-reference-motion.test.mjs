import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
import { brainScaleClock } from './brain-scale-helpers.mjs';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';

globalThis.React = React;
const plot = METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
const anchor = 'metric-panel-acquisition-economics';
const choose = metric => click(document.querySelector(`dialog [data-acquisition-metric="${metric}"]`));
const positions = () => [...document.querySelectorAll('dialog [data-source-observation]')].map(node => [node.dataset.sourceObservation, node.getAttribute('cy'), node.getAttribute('points')]);

test('ordinary-motion reference to reciprocal immediately restores historical domain before export can register', async () => {
  const clock = brainScaleClock();
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), '#' + anchor, clock.configure);
  try {
    await choose('dollars-per-voxel');
    const historical = positions();
    await choose('voxels-per-dollar');
    await click(document.querySelector('dialog [data-brain-scale-toggle]'));
    await clock.advance(700);
    assert.equal(document.querySelector('dialog svg').dataset.brainScaleProgress, '1');
    await choose('dollars-per-voxel');
    assert.equal(new URL(window.location.href).searchParams.has('brainScale'), false);
    assert.equal(document.querySelector('dialog [data-brain-scale-reference]'), null);
    assert.deepEqual(positions(), historical, 'no hidden scenario domain in the reciprocal export frame');
    const registered = await whenChartRegistered(anchor, 0);
    assert.ok(registered, 'settled reciprocal frame is immediately exportable');
    assert.equal(registered.getChart().svg.querySelector('[data-brain-scale-reference]'), null);
    await clock.advance(350);
    assert.deepEqual(positions(), historical, 'no unguarded reciprocal rescale after export registration');
    await clock.advance(350);
    assert.deepEqual(positions(), historical);
  } finally { await cleanup(); }
});
