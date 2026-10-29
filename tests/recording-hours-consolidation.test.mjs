import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, StrictMode } from 'react';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const title = 'Neural recording hours collected over time';
const raw = DRAFT_CHART_EVIDENCE[title];
const sourcePoints = raw.plots.flatMap(plot => plot.points);
const card = () => document.getElementById('draft-recording-hours');

test('recording hours renders one populated log scatter with five labeled series and all 12 unchanged observations', async () => {
  const before = JSON.stringify(raw);
  const cleanup = await mount(React.createElement(DraftChartsSection));
  try {
    await click(card().querySelector('[data-draft-popout-trigger]'));
    const el = document.querySelector('dialog[open]');
    assert.equal(el.querySelectorAll('svg.draft-plot-svg').length, 1, 'one shared chart, not per-dataset plots');
    assert.equal(card().querySelectorAll('[data-draft-panel]').length, 1);
    assert.equal(el.querySelectorAll('.draft-plot-inspector').length, 1);
    assert.equal(el.querySelector('.draft-plot-inspector').textContent, '');
    assert.equal(el.querySelectorAll('[data-copy-chart]').length, 1);
    assert.equal(el.querySelectorAll('[data-download-chart]').length, 1);
    assert.equal([...el.querySelectorAll('a')].filter(a => a.textContent === 'Direct link').length, 1);
    const points = METRIC_CHART_EVIDENCE[title].plots[0].points;
    assert.equal(points.length, 12);
    for (const original of sourcePoints) {
      const projected = points.find(point => point.id === original.id);
      for (const [key, value] of Object.entries(original)) assert.deepEqual(projected[key], value, `${original.id}: ${key}`);
    }
    assert.equal(JSON.stringify(raw), before, 'archive is not mutated');
    const marks = [...el.querySelectorAll('[data-source-observation]')];
    assert.deepEqual(marks.map(n => n.dataset.sourceObservation), sourcePoints.map(p => p.id));
    const legend = [...el.querySelectorAll('[data-draft-group-legend] li')];
    assert.deepEqual(legend.map(n => n.textContent.trim()), raw.plots.map(p => p.title));
    assert.equal(new Set(legend.map(n => n.querySelector('span').style.color)).size, 5);
    assert.match(el.querySelector('.draft-plot-legend').textContent, /Log scale.*Unconnected observations/);
    const svg = el.querySelector('svg.draft-plot-svg');
    assert.equal(svg.querySelectorAll('path, polyline').length, 0, 'no connecting lines or pooled fit');
    const ticks = [...svg.querySelectorAll('.draft-plot-tick')].map(n => n.textContent);
    for (const tick of ['100', '1,000', '10,000', '100,000', '2017', '2027']) assert.ok(ticks.includes(tick), tick);
    const pos = id => marks.find(n => n.dataset.sourceObservation === id);
    const y = id => Number(pos(id).getAttribute('cy'));
    assert.ok(Math.abs((y('poyo-primate-training-2023-10-24') - y('neuralink-reported-hours-2026-10-01')) / Math.log10(50000 / 100) - 232 / 3) < 1e-9, 'shared logarithmic hours coordinates');
    const rows = [...el.querySelectorAll('tbody tr')];
    assert.equal(rows.length, 12);
    sourcePoints.forEach((point, i) => {
      assert.ok(rows[i].textContent.includes(point.dateLabel));
      assert.equal(rows[i].querySelector('a').href, point.sourceUrl);
      assert.ok(rows[i].textContent.includes(point.note));
    });
    for (const plot of raw.plots) assert.ok(el.textContent.includes(plot.scope), `scope retained: ${plot.id}`);
    await act(async () => pos('neuralink-reported-hours-2026-10-01').dispatchEvent(new MouseEvent('mousemove', { bubbles: true })));
    assert.match(el.querySelector('[role=tooltip]').textContent, />50,000/);
    await act(async () => pos('poyo-primate-training-2023-10-24').dispatchEvent(new Event('focusin', { bubbles: true })));
    assert.match(el.querySelector('[role=tooltip]').textContent, />100/);
    await act(async () => pos('poyo-primate-training-2023-10-24').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(el.querySelector('.draft-plot-inspector').textContent, '');
  } finally { await cleanup(); }
});

import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const visible = selector => [...document.querySelectorAll(selector)].filter(n => !n.closest('[hidden]'));
const ids = ['neuralink-private-intracortical-hours', 'tusz-scalp-eeg', 'ajile12-intracranial', 'poyo-primate-training', 'japaneeg-scalp-eeg'];
async function search(value) {
  const input = document.querySelector('#metrics-search');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('the real page retires only the duplicate hours reference, its self-link and redundant introduction', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(!!document.querySelector('[data-performance-card="neural-recording-hours"]'), false, 'duplicate reference is unmounted');
    assert.deepEqual([...document.querySelectorAll('#metric-category-0 [data-performance-card], #metric-category-3 [data-performance-card]')].map(n => n.dataset.performanceCard), ['simultaneously-recorded-neurons']);
    assert.doesNotMatch(document.body.textContent, /Reference views\.|Earlier Atlas series with separate scope|not additional observations in the curated panels above/);
    assert.equal(card().querySelector('a[href="#neural-recording-hours"]'), null, 'no self-referential related chart');
    assert.match(card().querySelector('.draft-chart-methodology').textContent, /disclosure date.*log scale/);
    assert.equal(document.querySelector('[data-metric-toggle="Human interfaces and recordings"] small').textContent, '3 charts');
    for (const term of ['Neuralink', 'TUSZ', 'AJILE12', 'POYO', 'JapanEEG']) {
      await search(term);
      assert.equal(card().closest('[hidden]'), null, term);
      assert.equal(card().querySelectorAll('svg.draft-plot-svg').length, 1);
      assert.equal(visible('#metric-category-3 [data-performance-card]').length, 0, 'search does not revive old reference or match unrelated neuron view');
    }
    await click(document.querySelector('[data-clear-metrics]'));
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.equal(visible('.draft-plot').length, 0);
  } finally { await cleanup(); }
});

for (const anchor of ['neural-recording-hours', ...['draft', 'metric'].flatMap(prefix => [`${prefix}-recording-hours`, ...ids.map(id => `${prefix}-panel-${id}`)])]) {
  test(`${anchor} opens the shared chart from collapsed categories, search and history without the retired modal`, async () => {
    const scrolled = [];
    const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)), `#${anchor}`, win => {
      win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
      const focus = win.HTMLElement.prototype.focus;
      win.HTMLElement.prototype.focus = function(options) { if (!this.closest('[hidden]')) focus.call(this, options); };
    });
    try {
      await settle(); await settle();
      const target = document.getElementById(anchor);
      assert.ok(target, 'stable anchor exists');
      assert.ok(card().contains(target));
      assert.equal(target.closest('[hidden]'), null);
      assert.deepEqual(scrolled, [], 'popup entry does not scroll the page');
      const modal = document.querySelector('dialog[open]');
      assert.ok(modal);
      assert.equal(modal.querySelectorAll('[data-source-observation]').length, 12);
      assert.equal(visible('#draft-recording-hours [data-draft-preview] svg.draft-plot-svg').length, 1);
      assert.equal(document.activeElement === modal.querySelector('.pc-modal-header button'), true);
      await click(modal.querySelector('.pc-modal-header button')); await settle(); await settle();
      const count = scrolled.length;
      await search('TUSZ'); await settle();
      await click(document.querySelector('[data-clear-metrics]')); await settle();
      assert.equal(scrolled.length, count, 'no stale navigation during search');
      await search('no-match-xyz');
      await act(async () => navigatePerformance(anchor)); await settle(); await settle();
      assert.equal(document.querySelector('#metrics-search').value, '');
      assert.equal(card().closest('[hidden]'), null);
      await act(async () => navigatePerformance('expectations'));
      await act(async () => window.history.back()); await settle(); await settle();
      assert.equal(window.location.hash, `#${anchor}`);
      assert.equal(card().closest('[hidden]'), null);
      await act(async () => window.history.forward()); await settle(); await settle();
      assert.equal(window.location.hash, '#expectations');
      await act(async () => navigatePerformance(anchor)); await settle(); await settle();
      assert.ok(window.history.state.atlasModalFrom?.endsWith('#expectations'), 'popup keeps its return history');
      assert.equal(document.querySelectorAll('[data-performance-card="neural-recording-hours"]').length, 0);
    } finally { await cleanup(); }
  });
}


test('tissue-mapped opens the curated popup with seven preserved observations, not a duplicate reference or self-link', async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)), '#tissue-mapped', win => {
    win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    assert.equal(!!document.querySelector('[data-performance-card="tissue-mapped"]'), false);
    const modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    const tissue = document.getElementById('draft-brain-tissue-mapped');
    assert.ok(tissue.contains(document.getElementById('tissue-mapped')));
    assert.equal(tissue.closest('[hidden]'), null);
    assert.equal(document.activeElement === document.querySelector('dialog[open] .pc-modal-header button'), true);
    assert.deepEqual(scrolled, []);
    assert.equal(modal.querySelectorAll('svg.draft-plot-svg').length, 1);
    assert.deepEqual([...modal.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation), DRAFT_CHART_EVIDENCE['Brain tissue mapped over time'].plots.flatMap(plot => plot.points.map(p => p.id)));
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, 7);
    assert.equal(tissue.querySelector('a[href="#tissue-mapped"]'), null);
    assert.doesNotMatch(document.body.textContent, /reference views?/i);
    assert.equal(document.querySelector('[data-metric-toggle="Mapping Scale"] small').textContent, '6 charts');
    await click(modal.querySelector('.pc-modal-header button')); await settle(); await settle();
    await search('H01'); await settle();
    assert.equal(tissue.closest('[hidden]'), null);
    await search('no-match-xyz');
    await act(async () => navigatePerformance('tissue-mapped')); await settle(); await settle();
    assert.equal(document.querySelector('#metrics-search').value, '');
    await act(async () => navigatePerformance('expectations'));
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, '#tissue-mapped');
    assert.equal(tissue.closest('[hidden]'), null);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#expectations');
    await act(async () => navigatePerformance('tissue-mapped')); await settle(); await settle();
    assert.ok(window.history.state.atlasModalFrom?.endsWith('#expectations'));
    assert.equal(document.activeElement === document.querySelector('dialog[open] .pc-modal-header button'), true);
  } finally { await cleanup(); }
});
