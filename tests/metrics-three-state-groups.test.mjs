import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, StrictMode } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
import { readFileSync } from 'node:fs';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const names = ['Neurotech field engagement', 'Human interfaces and recordings', 'Mapping Scale', 'Cost and automation', 'Simulation and NeuroAI'];
const visible = selector => [...document.querySelectorAll(selector)].filter(n => !n.closest('[hidden]'));
const group = name => [...document.querySelectorAll('[data-metrics-category]')].find(n => n.dataset.metricsCategory === name);

test('five ordered groups default to all charts, with independent collapsed/full states', async () => {
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)));
  try {
    assert.deepEqual([...document.querySelectorAll('[data-metrics-category]')].map(n => n.dataset.metricsCategory), names);
    assert.ok(names.every(name => group(name).dataset.metricState === 'full'));
    assert.equal(document.querySelector('[data-metric-more]'), null);
    assert.equal(visible('[data-draft-chart-card]').length, 15, 'Every numeric plot and timeline is visible from the start');
    assert.deepEqual(visible('[data-trends-card]').map(n => n.dataset.trendsCard), ['neurotech', 'neuralink']);
    assert.equal(visible('[data-performance-card]').length, 4);
    assert.equal(visible('svg.draft-plot-svg').length, 15);
    assert.equal(visible('.gt-preview svg').length, 2);
    for (const name of names) {
      const el = group(name), toggle = el.querySelector('[data-metric-toggle]');
      const cards = [...el.querySelectorAll('article')];
      assert.equal(toggle.tagName, 'BUTTON');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      toggle.focus(); await click(toggle);
      assert.equal(el.dataset.metricState, 'collapsed');
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(document.activeElement === toggle, true);
      assert.ok(cards.every(card => card.closest('[hidden]')));
      assert.ok(names.filter(other => other !== name).every(other => group(other).dataset.metricState === 'full'), 'Heading collapse affects only its own group');
      await click(toggle);
      assert.equal(el.dataset.metricState, 'full');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      assert.deepEqual([...el.querySelectorAll('article')].filter(card => !card.closest('[hidden]')), cards, 'Reopening restores all existing cards in the same order');
    }
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.ok(names.every(name => group(name).dataset.metricState === 'collapsed'));
    assert.equal(visible('[data-draft-chart-card], [data-trends-card], [data-performance-card]').length, 0);
    await click(document.querySelector('[data-expand-metrics]'));
    assert.ok(names.every(name => group(name).dataset.metricState === 'full'));
    assert.equal(visible('[data-draft-chart-card]').length, 15, 'Each of the 14 numeric plots and the timeline is a peer tile');
    assert.equal(visible('svg.draft-plot-svg:not([data-draft-event-timeline])').length, 14);
    assert.equal(visible('[data-source-observation]').length, 77);
    assert.equal(visible('[data-trends-card]').length, 2);
    assert.equal(visible('[data-performance-card]').length, 4);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(new Set(ids).size, ids.length, 'collapse/reopen reuse the same instances');
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.ok(names.every(name => group(name).dataset.metricState === 'collapsed'));
    assert.equal(visible('[data-draft-chart-card], [data-trends-card], [data-performance-card]').length, 0);
  } finally { await cleanup(); }
});


for (const [anchor, name] of [
  ['metric-recording-hours', 'Human interfaces and recordings'],
  ['metric-open-access-data', 'Mapping Scale'],
  ['metric-imaging-cost-efficiency', 'Cost and automation'],
  ['metric-neuroai-frontier', 'Simulation and NeuroAI'],
  ['google-trends-neurotech', 'Neurotech field engagement'],
  ['metric-paired-structure-function', 'Mapping Scale'],
  ['draft-panel-tissue-cm3', 'Mapping Scale'],
  ['metric-panel-pathfinder-nerl', 'Cost and automation'],
  ['metric-panel-flyvis-contrast', 'Simulation and NeuroAI'],
  ['simultaneously-recorded-neurons', 'Human interfaces and recordings'],
  ['google-trends-neuralink', 'Neurotech field engagement'],
  ['idea_vintage', 'Neurotech field engagement'],
  ['revealed_commitments', 'Neurotech field engagement'],
]) test(`${anchor} reveals its owning full group without duplicate chart instances`, async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)), `#${anchor}`, win => {
    win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    assert.equal(group(name).dataset.metricState, 'full');
    assert.equal(group(name).closest('[hidden]'), null);
    const target = document.getElementById(anchor) ?? document.querySelector(`[data-performance-card="${anchor}"]`) ?? document.querySelector(`[data-trends-card="${anchor.replace('google-trends-', '')}"]`);
    assert.ok(target);
    assert.equal(target.closest('[hidden]'), null);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(ids.length, new Set(ids).size);
  } finally { await cleanup(); }
});

test('search exposes matching charts in merged groups, clear restores state, history reveals full groups', async () => {
  const cleanup = await mount(React.createElement(Page), '#performance_curves', win => { win.HTMLElement.prototype.scrollIntoView = () => {}; });
  try {
    await click(group('Mapping Scale').querySelector('[data-metric-toggle]'));
    const input = document.querySelector('#metrics-search');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'paired structure'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(group('Mapping Scale').dataset.metricState, 'full');
    assert.ok(visible('[data-draft-chart-card]').some(n => n.id === 'draft-paired-structure-function'));
    assert.ok([...document.querySelectorAll('[data-metric-toggle]')].every(n => n.disabled));
    await click(document.querySelector('[data-clear-metrics]'));
    assert.equal(group('Mapping Scale').dataset.metricState, 'collapsed');
    await act(async () => navigatePerformance('metric-paired-structure-function')); await settle(); await settle();
    assert.equal(group('Mapping Scale').dataset.metricState, 'full');
    await act(async () => navigatePerformance('metric-neuroai-frontier')); await settle(); await settle();
    assert.equal(group('Simulation and NeuroAI').dataset.metricState, 'full');
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-paired-structure-function');
    assert.equal(document.getElementById('metric-paired-structure-function').closest('[hidden]'), null);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-neuroai-frontier');
    assert.equal(document.getElementById('metric-neuroai-frontier').closest('[hidden]'), null);
  } finally { await cleanup(); }
});


test('heading and global collapse/expand controls retain a touch-sized minimum, not unstyled text', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    document.head.append(style);
    const controls = [...document.querySelectorAll('[data-metric-toggle], [data-expand-metrics], [data-collapse-metrics]')];
    assert.equal(controls.length, 7);
    for (const control of controls) assert.equal(getComputedStyle(control).minHeight, '44px');
  } finally { await cleanup(); }
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
