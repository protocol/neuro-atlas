import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
for (const [anchor, x, y] of [
  ['metric-panel-connectomics-roboem-human-split-merge', 'Split errors per mm of axon path', 'Merge errors per mm of axon path'],
  ['metric-panel-pathfinder-nerl', 'Publication year', 'Normalized ERL (%)'],
  ['metric-panel-proofreading-effort', 'Publication year', 'Person-years'],
]) test(`${anchor}: methodology names the plotted axes`, async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection, { flat: true, showGaps: false }), '#' + anchor);
  try {
    const method = document.querySelector('dialog[open] [data-draft-methodology]');
    const axes = method.querySelector('dl > div');
    assert.equal(axes.querySelector('dt').textContent, 'Axes');
    assert.equal(axes.querySelector('dd').textContent, `x-axis: ${x} · y-axis: ${y}`);
  } finally { await cleanup(); }
});

test('growth reference statuses retain source metadata in downloads and omit acquisition planning from the table', async () => {
  const snapshot = { ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() };
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#publication-growth');
  try {
    const table = document.querySelector('[aria-label="Growth numerator and matched reference values"] table');
    const rows = [...table.querySelectorAll('tbody tr')];
    assert.ok(rows.some(row => row.textContent.includes('Reference unavailable')));
    assert.doesNotMatch(table.textContent, /separately scoped|multi-day|No comparable denominator|acquisition awaits/i);
    const payload = JSON.parse(decodeURIComponent(document.querySelector('a[download$="-source.json"]').href.split(',')[1]));
    assert.deepEqual(payload.matchedGrowth, snapshot.matchedGrowth);
  } finally { await cleanup(); }
});
