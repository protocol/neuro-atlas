import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { METRIC_GROUPS } from '../src/data/metric-chart-visibility.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('chapter headers count the rendered cards and the search placeholder totals them', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    let total = 0;
    for (const [index, group] of METRIC_GROUPS.entries()) {
      const category = document.querySelector(`[data-metrics-category="${group.name}"]`);
      const cards = category.querySelectorAll('[data-metric-rail] article').length;
      total += cards;
      assert.equal(category.querySelector('.metric-category-index').textContent, String(index + 1).padStart(2, '0'));
      assert.equal(category.querySelector('.metric-category-summary').textContent, group.summary);
      assert.equal(category.querySelector('.metric-category-count').textContent, `${cards} ${cards === 1 ? 'chart' : 'charts'}`);
      const toggle = category.querySelector('[data-metric-toggle]');
      assert.equal(toggle.textContent, group.name, 'Count, number and summary stay outside the accessible toggle name');
    }
    assert.equal(document.querySelector('#metrics-search').placeholder, `Search ${total} charts — try H01, mouse, recording hours…`);
    assert.equal(document.querySelector('label[for="metrics-search"]').textContent, 'Search charts', 'The search keeps a programmatic label');
  } finally { await cleanup(); }
});

test('curated scope sits in the card footer, outside the capped preview body', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const cards = [...document.querySelectorAll('[data-metric-rail] article[data-draft-chart-card]')];
    assert.ok(cards.length > 10);
    for (const card of cards) {
      const scope = card.querySelector('[data-metric-scope]');
      assert.ok(scope?.textContent.trim(), card.dataset.draftChartCard);
      assert.ok(scope.closest('[data-metric-card-footer]'), `${card.dataset.draftChartCard}: scope must not be clipped with the preview`);
      assert.equal(scope.closest('[data-metric-card-body]'), null);
      const line = scope.closest('.metric-card-scope');
      assert.equal(line.title, line.textContent.replace(/\s+/g, ' ').trim(), 'The full qualifier is available as a tooltip');
    }
  } finally { await cleanup(); }
});
