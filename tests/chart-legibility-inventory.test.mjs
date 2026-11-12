import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';

globalThis.React = React;
test('acceptance inventory and native QA fixture enumerate every current visible chart in rail order', () => {
  const inventory = JSON.parse(readFileSync('docs/qa/chart-legibility-20261112/acceptance-inventory.json', 'utf8'));
  const native = JSON.parse(readFileSync('tests/fixtures/chart-design-inventory.json', 'utf8'));
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const cards = [...dom.window.document.querySelectorAll('[data-metric-rail] article')].filter(card => !card.closest('[hidden], [inert]'));
    const titles = cards.map(card => card.querySelector('h3, .pc-card-title, figcaption').textContent);
    assert.equal(titles.length, 24, 'Derived from current route, not the earlier approximate scope');
    assert.deepEqual(inventory.charts.map(chart => chart.title), titles);
    assert.deepEqual(native.map(chart => chart.title), titles);
    assert.equal(new Set(inventory.charts.map(chart => chart.id)).size, titles.length);
    for (const chart of inventory.charts) {
      for (const criterion of ['point_size', 'annual_guides', 'series_connections', 'wider_ratio']) {
        assert.ok(['applies','not_applicable'].includes(chart[criterion].applicability), `${chart.id}: ${criterion}`);
        assert.ok(chart[criterion].decision.length > 12, `${chart.id}: explain the scientific/presentation decision`);
      }
      assert.equal(chart.native_qa, 'pending_parent', 'Do not imply native verification in a code-only worker');
    }
  } finally { dom.window.close(); }
});
