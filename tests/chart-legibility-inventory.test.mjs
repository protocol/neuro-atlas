import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';

globalThis.React = React;
test('the frozen historical inventory plus the explicit BCI addition enumerate every current chart in rail order', () => {
  const inventory = JSON.parse(readFileSync('docs/qa/chart-legibility-20261112/acceptance-inventory.json', 'utf8'));
  const additions = JSON.parse(readFileSync('tests/fixtures/bci-bitrate-chart-inventory.json', 'utf8'));
  assert.equal(inventory.charts.length, 24, 'Historical native acceptance evidence remains frozen');
  assert.equal(additions.length, 1, 'Only the independently specified new chart is additive');
  // The acceptance document is immutable; project only the explicitly approved
  // reciprocal-unit title into today's inventory, retaining its stable panel ID.
  const current = inventory.charts.flatMap(chart => chart.id === 'metric-panel-neuralink-cumulative' ? [chart, ...additions] : [chart])
    .map(chart => chart.id === 'metric-panel-acquisition-economics'
      ? { ...chart, title: 'Estimated acquisition efficiency — voxels per dollar' }
      : chart);
  const native = JSON.parse(readFileSync('tests/fixtures/chart-design-inventory.json', 'utf8'));
  // Only these three previews use compact copy; modal/export/canonical identities
  // remain the full titles in both inventories and their sharing contracts.
  const previewTitle = title => ({
    'Estimated acquisition efficiency — voxels per dollar': 'Imaging efficiency',
    'Simultaneous neural recordings': 'Neurons per experiment',
    'Selected published connectomes — neuron counts': 'Neuron counts',
  }[title] ?? title);
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const cards = [...dom.window.document.querySelectorAll('[data-metric-rail] article')].filter(card => !card.closest('[hidden], [inert]'));
    const titles = cards.map(card => card.querySelector('h3, .pc-card-title, figcaption').textContent);
    assert.equal(titles.length, 25, 'Derived from current route, not the earlier approximate scope');
    assert.deepEqual(current.map(chart => previewTitle(chart.title)), titles);
    assert.deepEqual(native.map(chart => previewTitle(chart.title)), titles);
    assert.equal(new Set(current.map(chart => chart.id)).size, titles.length);
    for (const chart of current) {
      for (const criterion of ['point_size', 'annual_guides', 'series_connections', 'wider_ratio']) {
        assert.ok(['applies','not_applicable'].includes(chart[criterion].applicability), `${chart.id}: ${criterion}`);
        assert.ok(chart[criterion].decision.length > 12, `${chart.id}: explain the scientific/presentation decision`);
      }
      assert.equal(chart.native_qa, 'pending_parent', 'Do not imply native verification in a code-only worker');
    }
  } finally { dom.window.close(); }
});
