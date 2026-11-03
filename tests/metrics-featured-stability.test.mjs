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

test('full rails retain the featured tile first and preserve every peer through collapse and reopen', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    for (const [group, anchor] of featured) {
      const category = document.querySelector(`[data-metrics-category="${group}"]`);
      const grid = category.querySelector('[data-metric-rail]');
      const tile = grid.querySelector(`[data-draft-popout="${anchor}"]`).closest('article');
      const cards = visibleCards(grid);
      assert.ok(cards.length > 1, `${group}: peers are visible from the start`);
      assert.equal(visibleCards(grid)[0], tile);
      const toggle = category.querySelector('[data-metric-toggle]');
      await click(toggle);
      assert.deepEqual(visibleCards(grid), []);
      assert.equal(tile.isConnected, true);
      await click(toggle);
      assert.equal(category.dataset.metricState, 'full');
      assert.equal(visibleCards(grid)[0], tile, `${group}: peers must follow—not precede—the existing featured chart`);
      assert.deepEqual(visibleCards(grid), cards, 'All existing peers return in unchanged order without remounting');
    }
  } finally { await cleanup(); }
});
