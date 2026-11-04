import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DRAFT_CHART_LINKS } from '../src/data/draft-chart-links.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const expectedOrder = [
  'metric-panel-acquisition-economics',
  'metric-panel-connectomics-roboem-human-split-merge',
  'metric-panel-proofreading-effort',
  'metric-panel-pathfinder-nerl',
];
const aliasOwners = [
  ['imaging-cost-efficiency', expectedOrder[0]],
  ['panel-acquisition-economics', expectedOrder[0]],
  ['panel-connectomics-roboem-human-split-merge', expectedOrder[1]],
  ['panel-connectomics-roboem-mouse-split-merge', expectedOrder[1]],
  ['proofreading-burden', expectedOrder[2]],
  ['panel-proofreading-effort', expectedOrder[2]],
  ['reconstruction-accuracy', expectedOrder[3]],
  ['panel-pathfinder-nerl', expectedOrder[3]],
];

test('Cost rail places human/mouse cortex second and the former second chart last without changing identities or evidence', async () => {
  const sourceBefore = JSON.stringify(DRAFT_CHART_EVIDENCE);
  const presentationBefore = JSON.stringify(METRIC_CHART_EVIDENCE);
  const linksBefore = JSON.stringify(DRAFT_CHART_LINKS);
  const cleanup = await mount(React.createElement(Page));
  try {
    const group = document.querySelector('[data-metrics-category="Cost and automation"]');
    const rail = group.querySelector('[data-metric-rail]');
    const tiles = () => [...rail.querySelectorAll('[data-metric-tile]')];
    const order = () => tiles().map(tile => tile.querySelector('[data-draft-popout]').dataset.draftPopout);
    assert.deepEqual(order(), expectedOrder);
    assert.equal(tiles()[1].querySelector('figcaption').textContent, 'Human and mouse cortex: split–merge error trade-offs');
    const originalTiles = tiles();
    for (const [suffix, owner] of aliasOwners) {
      for (const prefix of ['draft', 'metric']) {
        const target = document.getElementById(`${prefix}-${suffix}`);
        assert.ok(target, `${prefix}-${suffix} still exists`);
        assert.equal(target.closest('[data-metric-tile]').querySelector('[data-draft-popout]').dataset.draftPopout, owner);
      }
    }
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    assert.equal(new Set(ids).size, ids.length, 'Every stable fragment remains unique');
    await click(group.querySelector('[data-metric-toggle]'));
    assert.equal(group.dataset.metricState, 'collapsed');
    await click(group.querySelector('[data-metric-toggle]'));
    assert.equal(group.dataset.metricState, 'full');
    assert.deepEqual(order(), expectedOrder);
    assert.deepEqual(tiles(), originalTiles, 'Presentation reordering never remounts the charts');
    const input = document.querySelector('#metrics-search');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Cost and automation');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.deepEqual(order(), expectedOrder);
    await click(document.querySelector('[data-clear-metrics]'));
    assert.deepEqual(order(), expectedOrder);
    assert.deepEqual(tiles(), originalTiles);
    assert.equal(JSON.stringify(DRAFT_CHART_EVIDENCE), sourceBefore, 'Source evidence is not reordered or rewritten');
    assert.equal(JSON.stringify(METRIC_CHART_EVIDENCE), presentationBefore, 'Evidence projection stays unchanged');
    assert.equal(JSON.stringify(DRAFT_CHART_LINKS), linksBefore, 'Fragment contracts stay unchanged');
  } finally { await cleanup(); }
});
