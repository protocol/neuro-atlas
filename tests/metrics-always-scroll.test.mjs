import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const cards = rail => [...rail.querySelectorAll('article')].filter(card => !card.closest('[hidden]'));
const identity = card => card.querySelector('[data-draft-popout]')?.dataset.draftPopout ?? card.dataset.performanceCard ?? card.dataset.trendsCard ?? card.dataset.metricReading;
// Established native rail identities, with the owner-requested Nov. 3 Cost order.
const existingOrder = [
  ['neurotech', 'idea_vintage', 'latency_compression', 'revealed_commitments'],
  ['metric-recording-hours', 'metric-panel-neuralink-cumulative', 'simultaneously-recorded-neurons'],
  ['metric-panel-public-data-size', 'metric-panel-tissue-cm3', 'metric-panel-largest-connectome-neurons', 'metric-panel-largest-connectome-synapses', 'metric-panel-acquisition-rates', 'metric-panel-paired-manual'],
  ['metric-panel-acquisition-economics', 'metric-panel-connectomics-roboem-human-split-merge', 'metric-panel-proofreading-effort', 'metric-panel-pathfinder-nerl'],
  ['metric-panel-neuroai-imagenet', 'metric-panel-flyvis-contrast', 'metric-panel-application-events'],
];

test('every Metrics row starts with all charts in the existing expanded order and has no featured-only control', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const categories = [...document.querySelectorAll('[data-metrics-category]')];
    assert.equal(categories.length, 5);
    assert.equal(document.querySelectorAll('[data-metric-more]').length, 0, 'Remove both featured-only / show-more controls');
    assert.doesNotMatch(document.querySelector('.metrics-index').textContent, /show more charts|show only featured/i);
    const initial = categories.map(category => cards(category.querySelector('[data-metric-rail]')).map(identity));
    assert.deepEqual(initial, existingOrder, 'Default rails preserve the exact established section and chart order');
    await click(document.querySelector('[data-expand-metrics]'));
    assert.deepEqual(categories.map(category => cards(category.querySelector('[data-metric-rail]')).map(identity)), initial);
    for (const category of categories) {
      const toggle = category.querySelector('[data-metric-toggle]');
      const inventory = cards(category.querySelector('[data-metric-rail]')).map(identity);
      await click(toggle);
      await click(toggle);
      assert.deepEqual(cards(category.querySelector('[data-metric-rail]')).map(identity), inventory, 'Reopening a row restores every chart, never a featured-only view');
    }
  } finally { await cleanup(); }
});
