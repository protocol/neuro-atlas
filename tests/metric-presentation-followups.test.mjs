import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;

test('NeuroAI title describes the performance–cost comparison without implying a time series', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection, { flat: true }));
  try {
    const card = document.getElementById('draft-neuroai-frontier');
    assert.equal(card.querySelector('figcaption').textContent, 'NeuroAI performance–cost frontier');
    assert.equal(card.querySelector('[data-copy-draft-link]').getAttribute('aria-label'), 'Copy link to NeuroAI performance–cost frontier');
    assert.ok(card.querySelector('#metric-neuroai-frontier'));
    assert.ok(card.querySelector('#metric-panel-neuroai-imagenet'));
    assert.doesNotMatch(card.textContent, /frontier over time/);
    const original = DRAFT_CHART_EVIDENCE['NeuroAI performance–cost frontier over time'].plots[0];
    assert.deepEqual([...card.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation), original.points.map(p => p.id));
    await click(card.querySelector('[data-draft-popout-trigger]'));
    const modal = document.querySelector('dialog[open]');
    assert.equal(modal.querySelector('h2').textContent, 'NeuroAI performance–cost frontier');
    assert.equal(modal.querySelector('figcaption').textContent, 'NeuroAI performance–cost frontier');
    assert.doesNotMatch(modal.textContent, /frontier over time/);
  } finally { await cleanup(); }
});


import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
for (const prefix of ['draft', 'metric']) test(`${prefix} acquisition economics belongs to Cost and automation without changing its values or scope`, async () => {
  const anchor = `${prefix}-panel-acquisition-economics`;
  const scrolled = [];
  const cleanup = await mount(React.createElement(Page), `#${anchor}`, win => {
    win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    const panel = document.getElementById(anchor).closest('[data-draft-panel]');
    assert.equal(panel.closest('[data-metrics-category]').dataset.metricsCategory, 'Cost and automation');
    assert.equal(panel.closest('[hidden]'), null);
    assert.deepEqual(scrolled, [], 'popup navigation does not scroll the page');
    const source = DRAFT_CHART_EVIDENCE['Connectomics imaging throughput over time'].plots.find(p => p.id === 'acquisition-economics');
    const projected = METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots;
    assert.deepEqual(projected[0].points.map(p => ({ id: p.id, x: p.x, y: p.y, sourceUrl: p.sourceUrl, quote: p.quote })), source.points.map(p => ({ id: p.id, x: p.x, y: p.y * 10_000_000, sourceUrl: p.sourceUrl, quote: p.quote })), 'Per-million unit conversion retains exact source identity and precision');
    assert.equal(panel.closest('article').dataset.draftChartCard, 'Connectomics imaging cost efficiency');
    assert.ok(document.getElementById('metric-imaging-cost-efficiency'));
    assert.equal(panel.querySelector('figcaption').textContent, projected[0].title);
    assert.deepEqual([...panel.querySelectorAll('[data-draft-preview] [data-source-observation]')].map(n => n.dataset.sourceObservation), source.points.map(p => p.id));
    assert.ok(panel.textContent.includes(source.scope));
    const acquisition = document.getElementById('draft-panel-acquisition-rates');
    assert.equal(acquisition.closest('[data-metrics-category]').dataset.metricsCategory, 'Mapping Scale');
    assert.equal(acquisition.closest('article').querySelectorAll('[data-draft-panel]').length, 1);
    assert.doesNotMatch(acquisition.closest('article').textContent, /cost.efficiency|cost per voxel|\$\/voxel/i);
    assert.equal(document.getElementById('draft-mapping-cost').closest('article'), null, 'not presented as end-to-end mapping cost');
    await click(document.querySelector('dialog[open] .pc-modal-header button')); await settle(); await settle();
    await click(document.querySelector('[data-collapse-metrics]'));
    await act(async () => navigatePerformance(anchor)); await settle(); await settle();
    assert.equal(panel.closest('[hidden]'), null);
    await act(async () => navigatePerformance('metric-panel-acquisition-rates'));
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, `#${anchor}`);
    assert.equal(panel.closest('[hidden]'), null);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-panel-acquisition-rates');
    await click(document.querySelector('dialog[open] .pc-modal-header button')); await settle(); await settle();
    const input = document.querySelector('#metrics-search');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'cost efficiency'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(panel.closest('[hidden]'), null, 'cost search locates moved plot');
  } finally { await cleanup(); }
});
