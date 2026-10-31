import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, StrictMode } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const names = ['Neurotech field engagement', 'Human interfaces and recordings', 'Mapping Scale', 'Cost and automation', 'Simulation and NeuroAI'];
const visible = selector => [...document.querySelectorAll(selector)].filter(n => !n.closest('[hidden]'));
const group = name => [...document.querySelectorAll('[data-metrics-category]')].find(n => n.dataset.metricsCategory === name);

test('five ordered groups default to exactly their selected chart, with independent collapsed/preview/full states', async () => {
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)));
  try {
    assert.deepEqual([...document.querySelectorAll('[data-metrics-category]')].map(n => n.dataset.metricsCategory), names);
    assert.ok(names.every(name => group(name).dataset.metricState === 'preview'));
    assert.deepEqual(visible('[data-draft-chart-card]').map(n => n.id), ['draft-recording-hours', 'draft-open-access-data', 'draft-imaging-cost-efficiency', 'draft-neuroai-frontier']);
    assert.deepEqual(visible('[data-trends-card]').map(n => n.dataset.trendsCard), ['neurotech']);
    assert.equal(visible('[data-performance-card]').length, 0);
    assert.equal(visible('svg.draft-plot-svg').length, 4);
    assert.equal(visible('.gt-preview svg').length, 1);
    for (const name of names) {
      const el = group(name), toggle = el.querySelector('[data-metric-toggle]'), more = el.querySelector('[data-metric-more]');
      assert.equal(toggle.tagName, 'BUTTON');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(more.getAttribute('aria-expanded'), 'false');
      toggle.focus(); await click(toggle);
      assert.equal(el.dataset.metricState, 'collapsed');
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(document.activeElement === toggle, true);
      await click(toggle);
      assert.equal(el.dataset.metricState, 'preview');
      await click(more);
      assert.equal(el.dataset.metricState, 'full');
      assert.equal(more.getAttribute('aria-expanded'), 'true');
      await click(more);
      assert.equal(el.dataset.metricState, 'preview');
    }
    await click(document.querySelector('[data-expand-metrics]'));
    assert.ok(names.every(name => group(name).dataset.metricState === 'full'));
    assert.equal(visible('[data-draft-chart-card]').length, 15, 'Each of the 14 numeric plots and the timeline is a peer tile');
    assert.equal(visible('svg.draft-plot-svg:not([data-draft-event-timeline])').length, 14);
    assert.equal(visible('[data-source-observation]').length, 77);
    assert.equal(visible('[data-trends-card]').length, 2);
    assert.equal(visible('[data-performance-card]').length, 3);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(new Set(ids).size, ids.length, 'preview/full reuse the same instances');
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.ok(names.every(name => group(name).dataset.metricState === 'collapsed'));
    assert.equal(visible('[data-draft-chart-card], [data-trends-card], [data-performance-card]').length, 0);
  } finally { await cleanup(); }
});


for (const [anchor, name, state] of [
  ['metric-recording-hours', 'Human interfaces and recordings', 'preview'],
  ['metric-open-access-data', 'Mapping Scale', 'preview'],
  ['metric-imaging-cost-efficiency', 'Cost and automation', 'preview'],
  ['metric-neuroai-frontier', 'Simulation and NeuroAI', 'preview'],
  ['google-trends-neurotech', 'Neurotech field engagement', 'preview'],
  ['metric-paired-structure-function', 'Mapping Scale', 'full'],
  ['draft-panel-tissue-cm3', 'Mapping Scale', 'full'],
  ['metric-panel-pathfinder-nerl', 'Cost and automation', 'full'],
  ['metric-panel-flyvis-contrast', 'Simulation and NeuroAI', 'full'],
  ['simultaneously-recorded-neurons', 'Human interfaces and recordings', 'full'],
  ['google-trends-neuralink', 'Neurotech field engagement', 'full'],
  ['idea_vintage', 'Neurotech field engagement', 'full'],
  ['revealed_commitments', 'Neurotech field engagement', 'full'],
]) test(`${anchor} reveals its owning ${state} state without duplicate chart instances`, async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)), `#${anchor}`, win => {
    win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    assert.equal(group(name).dataset.metricState, state);
    assert.equal(group(name).closest('[hidden]'), null);
    const target = document.getElementById(anchor) ?? document.querySelector(`[data-performance-card="${anchor}"]`) ?? document.querySelector(`[data-trends-card="${anchor.replace('google-trends-', '')}"]`);
    assert.ok(target);
    assert.equal(target.closest('[hidden]'), null);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(ids.length, new Set(ids).size);
  } finally { await cleanup(); }
});

test('search exposes non-featured charts in merged groups, clear restores state, history reveals the right depth', async () => {
  const cleanup = await mount(React.createElement(Page), '#performance_curves', win => { win.HTMLElement.prototype.scrollIntoView = () => {}; });
  try {
    await click(group('Mapping Scale').querySelector('[data-metric-toggle]'));
    const input = document.querySelector('#metrics-search');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'paired structure'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(group('Mapping Scale').dataset.metricState, 'full');
    assert.ok(visible('[data-draft-chart-card]').some(n => n.id === 'draft-paired-structure-function'));
    assert.ok([...document.querySelectorAll('[data-metric-toggle], [data-metric-more]')].every(n => n.disabled));
    await click(document.querySelector('[data-clear-metrics]'));
    assert.equal(group('Mapping Scale').dataset.metricState, 'collapsed');
    await act(async () => navigatePerformance('metric-paired-structure-function')); await settle(); await settle();
    assert.equal(group('Mapping Scale').dataset.metricState, 'full');
    await act(async () => navigatePerformance('metric-neuroai-frontier')); await settle(); await settle();
    assert.equal(group('Simulation and NeuroAI').dataset.metricState, 'preview');
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-paired-structure-function');
    assert.equal(document.getElementById('metric-paired-structure-function').closest('[hidden]'), null);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-neuroai-frontier');
    assert.equal(document.getElementById('metric-neuroai-frontier').closest('[hidden]'), null);
  } finally { await cleanup(); }
});


test('chart expansion controls retain a touch-sized minimum, not unstyled text', () => {
  const dom = new JSDOM('<style></style><button class="metric-category-more">show more charts</button>');
  try {
    dom.window.document.querySelector('style').textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('button')).minHeight, '44px');
  } finally { dom.window.close(); }
});


test('search recognizes all five displayed group names and reveals their full contents', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const input = document.querySelector('#metrics-search');
    for (const name of names) {
      await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, name); input.dispatchEvent(new Event('input', { bubbles: true })); });
      assert.equal(group(name).hidden, false, name);
      assert.equal(group(name).dataset.metricState, 'full');
      assert.ok([...group(name).querySelectorAll('[data-draft-chart-card], [data-trends-card]')].some(n => !n.closest('[hidden]')), name);
    }
  } finally { await cleanup(); }
});
