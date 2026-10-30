import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES } from '../src/data/draft-charts.ts';
import { METRIC_CHART_EVIDENCE as DRAFT_CHART_EVIDENCE, METRIC_CHART_CATEGORIES, METRIC_GROUPS, isVisibleMetric } from '../src/data/metric-chart-visibility.ts';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;

test('Metrics is one preview-default, keyboard-native index in the five-group order', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }));
  try {
    assert.deepEqual([...document.querySelectorAll('button[aria-current]')].map(n => n.textContent), ['Metrics']);
    assert.equal([...document.querySelectorAll('button')].some(n => n.textContent === 'Draft charts'), false);
    const toggles = [...document.querySelectorAll('[data-metric-toggle]')];
    assert.deepEqual(toggles.map(n => n.dataset.metricToggle), METRIC_GROUPS.map(group => group.name));
    for (const toggle of toggles) {
      assert.equal(toggle.tagName, 'BUTTON');
      assert.equal(toggle.type, 'button');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(document.getElementById(toggle.getAttribute('aria-controls')).hidden, false);
    }
    await click(document.querySelector('[data-collapse-metrics]'));
    toggles[0].focus();
    await click(toggles[0]); // native buttons activate identically with Enter/Space in browsers
    await click(toggles[1]);
    assert.equal(toggles[0].getAttribute('aria-expanded'), 'true');
    assert.equal(toggles[1].getAttribute('aria-expanded'), 'true');
    assert.equal(document.activeElement, toggles[0]);
    await click(toggles[0]);
    assert.equal(toggles[0].getAttribute('aria-expanded'), 'false');
    assert.equal(document.querySelectorAll('[data-draft-chart-card]').length, 13);
    assert.equal(document.querySelectorAll('[data-draft-chart-status="gap"], [data-draft-evidence-gaps]').length, 0);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 77);
  } finally { await cleanup(); }
});

async function search(value) {
  const input = document.querySelector('input[type="search"]');
  assert.ok(input, 'Search available');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const visible = selector => [...document.querySelectorAll(selector)].filter(n => !n.closest('[hidden]'));
test('search matches dataset/species and panel titles, opens results; clear restores expansion; bulk controls work', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }));
  try {
    await click(document.querySelector('[data-collapse-metrics]'));
    await click(document.querySelector('[data-metric-toggle="Cost and automation"]'));
    await search('H01');
    assert.ok(visible('[data-draft-chart-card]').length > 0);
    assert.ok(visible('[data-draft-chart-card]').some(n => n.textContent.includes('H01')));
    await search('no-such-dataset-xyz');
    assert.match(document.querySelector('[role=status]').textContent, /No metrics match/);
    assert.equal(visible('[data-draft-chart-card]').length, 0);
    await click(document.querySelector('[data-clear-metrics]'));
    assert.deepEqual([...document.querySelectorAll('[data-metric-toggle][aria-expanded=true]')].map(n => n.dataset.metricToggle), ['Cost and automation']);
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(document.querySelectorAll('[data-metric-toggle][aria-expanded=true]').length, 5);
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.equal(document.querySelectorAll('[data-metric-toggle][aria-expanded=true]').length, 0);
  } finally { await cleanup(); }
});

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
test('only the unique capability chart remains alongside curated measurements', () => {
  const data = selectPerformance(feed);
  const refs = { recording: React.createElement(PerformanceCurves, { data, provenance, selection: ['simultaneously-recorded-neurons'] }) };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(VelocityTabs, { performance: null, references: refs })));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-performance-card]').length, 1);
    assert.equal(doc.querySelectorAll('[data-coming-soon]').length, 0);
    assert.equal(doc.querySelector('[data-performance-card="tissue-mapped"], [data-performance-card="neural-recording-hours"]'), null);
    assert.ok(doc.querySelector('#metric-category-3 [data-performance-card="simultaneously-recorded-neurons"]'));
    assert.doesNotMatch(doc.body.textContent, /Reference views/);
    const ids = [...doc.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(new Set(ids).size, ids.length);
  } finally { dom.window.close(); }
});

import { navigatePerformance, performanceUrl } from '../src/lib/field-velocity/navigation.ts';
test('clean and legacy links override search/collapse, reveal exact target and retain back/forward', async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }), '#draft-charts', win => { win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); }; });
  try {
    await search('unmatched-xyz');
    await act(async () => navigatePerformance('metric-panel-tissue-cm3'));
    await settle(); await settle();
    assert.equal(document.querySelector('input').value, '');
    assert.equal(document.getElementById('draft-panel-tissue-cm3').closest('[hidden]'), null);
    assert.equal(scrolled.includes('metric-panel-tissue-cm3'), false);
    assert.ok(document.querySelector('dialog[open]'));
    assert.ok(window.history.state.atlasModalFrom?.endsWith('#draft-charts'));
    await act(async () => navigatePerformance('draft-mapping-cost'));
    await settle(); await settle();
    assert.equal(document.querySelector('#draft-mapping-cost').closest('[data-metrics-category]').dataset.metricsCategory, 'Cost and automation');
    assert.equal(document.querySelector('[data-metric-toggle="Cost and automation"]').getAttribute('aria-expanded'), 'true');
    assert.equal(document.querySelector('#draft-mapping-cost').closest('[data-draft-chart-card]'), null);
    assert.ok(scrolled.includes('draft-mapping-cost'));
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-panel-tissue-cm3');
    assert.ok(document.querySelector('dialog[open] .draft-popout-detail [data-source-observation]'));
    assert.equal(document.getElementById('metric-panel-tissue-cm3').closest('[hidden]'), null);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#draft-mapping-cost');
    assert.equal(document.querySelector('dialog[open]'), null);
    assert.equal(performanceUrl('https://example.org/base/field-velocity?x=1&x=2', 'metric-panel-tissue-cm3'), 'https://example.org/base/field-velocity?x=1&x=2#metric-panel-tissue-cm3');
  } finally { await cleanup(); }
});

test('search includes references and field context, labels category results, disables search-time toggles', async () => {
  const refs = { recording: React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, selection: ['simultaneously-recorded-neurons'] }) };
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: React.createElement('p', null, 'Idea vintage · Google Trends'), references: refs }));
  try {
    for (const term of ['Simultaneously recorded neurons', 'Idea vintage', 'Google Trends']) {
      await search(term);
      assert.ok(visible('[data-metric-toggle]').length > 0, term);
      assert.ok(visible('[data-metric-toggle]').every(n => n.disabled));
      assert.match(document.querySelector('[role=status]').textContent, /matching categor/);
    }
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(document.querySelector('input').value, '');
    assert.equal(document.querySelectorAll('[data-metric-toggle][aria-expanded=true]').length, 5);
  } finally { await cleanup(); }
});

test('search excludes retired definitions and unwired placeholders', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }));
  try {
    const retired = DRAFT_CHARTS.filter(chart => !isVisibleMetric(chart));
    for (const term of [...retired.map(chart => chart.title), 'Channel count frontier', 'Markets', 'term-structure aggregation', 'Enrolment is now accelerating']) {
      await search(term);
      assert.equal(visible('[data-metric-toggle]').length, 0, term);
      assert.match(document.querySelector('[role=status]').textContent, /No metrics match/, term);
    }
  } finally { await cleanup(); }
});

test('category styling keeps counts scannable and disclosures/search keyboard-visible on small screens', () => {
  const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
  assert.match(css, /\.metric-category\s*\{/);
  assert.match(css, /\.metrics-index[\s\S]*:focus-visible/);
  assert.match(css, /\.metric-category[\s\S]*overflow-wrap:\s*anywhere/);
});

import { createHash } from 'node:crypto';
import { DRAFT_CHART_LINKS, metricChartAnchors, draftChartAnchors } from '../src/data/draft-chart-links.ts';
test('unrevised definitions, provider snapshot and provenance remain byte-identical to base', () => {
  const frozen = {"src/data/draft-charts.ts": "cafa46498df5396063757e04126c7b8c6778df09b26d8f59f8cf7cb3902cb661", "src/data/draft-chart-observations.ts": "d4937f5b2c4b2a559cb8d341917b27f03a4572d4c6e9c38a62257c8fd87679f9", "src/data/field-velocity/neurotech.snapshot.json": "2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee", "src/data/field-velocity/neurotech.snapshot.json.provenance.json": "66df3d351fd6318ed289b1d0e8299ad8da9a7f6399becda046d17baf49f48b97", "src/data/velocity/neurotech_records.json": "57695c0a26d8f67f092bb951740ae75991d0b5ca8174027e9b03280232494f62", "public/data/google-trends/google-trends.json": "830e31c5315f6fefa07897a264136a04f098bbf107dafab9c660d6fd989dbc36"};
  for (const [path, sha] of Object.entries(frozen)) assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sha, path);
});
test('every canonical share link has exactly one legacy alias and an independently addressable target', () => {
  assert.equal(metricChartAnchors.length, 46);
  assert.equal(new Set([...metricChartAnchors, ...draftChartAnchors]).size, 92);
  for (const id of metricChartAnchors) assert.equal(performanceUrl('https://atlas.example/base/field-velocity?a=1&a=2', id), `https://atlas.example/base/field-velocity?a=1&a=2#${id}`);
  assert.equal(DRAFT_CHART_LINKS.length, 20);
});

for (const anchor of ['draft-panel-tissue-cm3', 'metric-panel-tissue-cm3']) {
  test(`${anchor} opens its popup without background scrolling during navigation or later search/disclosure changes`, async () => {
    const scrolled = [];
    const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }), `#${anchor}`, win => {
      win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
    });
    try {
      await settle(); await settle();
      assert.equal(scrolled.includes(anchor), false, 'popup entry does not scroll');
      assert.ok(document.querySelector('dialog[open]'));
      const historyLength = window.history.length;
      await act(async () => navigatePerformance(anchor)); await settle();
      assert.equal(window.history.length, historyLength, 'same popup hash adds no history');
      await click(document.querySelector('dialog[open] .pc-modal-header button')); await settle(); await settle();
      const count = scrolled.length;
      await search('H01'); await settle(); await settle();
      assert.equal(scrolled.length, count, 'typing must not navigate back to the old hash');
      await click(document.querySelector('[data-clear-metrics]')); await settle(); await settle();
      await click(document.querySelector('[data-metric-toggle="Cost and automation"]')); await settle(); await settle();
      assert.equal(scrolled.length, count, 'ordinary disclosure must not navigate back to the old hash');
      await click(document.querySelector('[data-metric-toggle="Mapping Scale"]'));
      await act(async () => navigatePerformance(anchor)); await settle(); await settle();
      assert.equal(document.querySelector('[data-metric-toggle="Mapping Scale"]').getAttribute('aria-expanded'), 'true');
      assert.equal(scrolled.length, count, 'popup navigation keeps the background fixed');
      assert.ok(document.querySelector('dialog[open]'));
    } finally { await cleanup(); }
  });
}

import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
test('the retained commitments fragment reveals Neurotech Engagement and scrolls its reading, not a modal', async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(Page), '#revealed_commitments', win => {
    win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    assert.equal(document.querySelector('[data-metric-toggle="Neurotech Engagement"]').getAttribute('aria-expanded'), 'true');
    assert.equal(document.querySelector('#revealed_commitments').closest('[hidden]'), null);
    assert.ok(scrolled.includes('revealed_commitments'));
    assert.equal(document.querySelector('dialog[open]'), null);
    await act(async () => navigatePerformance('performance_curves'));
    await act(async () => navigatePerformance('revealed_commitments'));
    assert.equal(window.history.state.atlasModalFrom, null);
  } finally { await cleanup(); }
});
