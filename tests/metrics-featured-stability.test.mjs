import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const featured = [
  ['Human interfaces and recordings', 'metric-recording-hours'],
  ['Mapping Scale', 'metric-panel-public-data-size'],
  ['Cost and automation', 'metric-panel-acquisition-economics'],
  ['Simulation and NeuroAI', 'metric-panel-neuroai-imagenet'],
];
const visibleCards = grid => [...grid.querySelectorAll('article')].filter(card => !card.closest('[hidden]'));

test('show more charts adds peers after the unchanged featured tile in the first rail slot', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    for (const [group, anchor] of featured) {
      const category = document.querySelector(`[data-metrics-category="${group}"]`);
      const grid = category.querySelector('[data-metric-rail]');
      const tile = grid.querySelector(`[data-draft-popout="${anchor}"]`).closest('article');
      assert.equal(visibleCards(grid)[0], tile);
      await click(category.querySelector('[data-metric-more]'));
      assert.equal(visibleCards(grid)[0] === tile, true, `${group}: revealed peers must follow—not precede—the existing featured chart`);
      assert.equal(tile.isConnected, true);
      await click(category.querySelector('[data-metric-more]'));
      assert.deepEqual(visibleCards(grid), [tile]);
    }
  } finally { await cleanup(); }
});
