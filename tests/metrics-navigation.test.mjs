import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { DRAFT_CHART_CATEGORIES } from '../src/data/draft-charts.ts';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;

test('Metrics is one collapsed, keyboard-native index in deck order, with separate field context', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }));
  try {
    assert.deepEqual([...document.querySelectorAll('button[aria-current]')].map(n => n.textContent), ['Metrics']);
    assert.equal([...document.querySelectorAll('button')].some(n => n.textContent === 'Draft charts'), false);
    const toggles = [...document.querySelectorAll('[data-metric-toggle]')];
    assert.deepEqual(toggles.map(n => n.dataset.metricToggle), [...DRAFT_CHART_CATEGORIES, 'Field context']);
    for (const toggle of toggles) {
      assert.equal(toggle.tagName, 'BUTTON');
      assert.equal(toggle.type, 'button');
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      assert.ok(document.getElementById(toggle.getAttribute('aria-controls')).hidden);
    }
    toggles[0].focus();
    await click(toggles[0]); // native buttons activate identically with Enter/Space in browsers
    await click(toggles[1]);
    assert.equal(toggles[0].getAttribute('aria-expanded'), 'true');
    assert.equal(toggles[1].getAttribute('aria-expanded'), 'true');
    assert.equal(document.activeElement, toggles[0]);
    await click(toggles[0]);
    assert.equal(toggles[0].getAttribute('aria-expanded'), 'false');
    assert.equal(document.querySelectorAll('[data-draft-chart-card]').length, 19);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 79);
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
    assert.equal(document.querySelectorAll('[data-metric-toggle][aria-expanded=true]').length, 7);
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
test('reference selections preserve original API but render every legacy card only once in appropriate categories', () => {
  const data = selectPerformance(feed);
  const refs = { mapping: React.createElement(PerformanceCurves, { data, provenance, selection: ['tissue-mapped'] }), recording: React.createElement(PerformanceCurves, { data, provenance, selection: ['neural-recording-hours', 'simultaneously-recorded-neurons', 'channel-count-frontier'] }) };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(VelocityTabs, { performance: null, references: refs })));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-performance-card]').length, 3);
    assert.equal(doc.querySelectorAll('[data-coming-soon]').length, 1);
    assert.ok(doc.querySelector('#metric-category-0 [data-performance-card="tissue-mapped"]'));
    assert.ok(doc.querySelector('#metric-category-3 [data-performance-card="neural-recording-hours"]'));
    assert.match(doc.querySelector('#metric-category-0').textContent, /Reference view/);
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
    assert.ok(scrolled.includes('metric-panel-tissue-cm3'));
    assert.equal(window.history.state.atlasModalFrom, null);
    await act(async () => navigatePerformance('draft-mapping-cost'));
    await settle(); await settle();
    assert.ok(document.querySelector('#draft-mapping-cost details').open);
    await act(async () => window.history.back()); await settle(); await settle();
    assert.equal(window.location.hash, '#metric-panel-tissue-cm3');
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(window.location.hash, '#draft-mapping-cost');
    assert.equal(performanceUrl('https://example.org/base/field-velocity?x=1&x=2', 'metric-panel-tissue-cm3'), 'https://example.org/base/field-velocity?x=1&x=2#metric-panel-tissue-cm3');
  } finally { await cleanup(); }
});

test('search includes references and field context, labels category results, disables search-time toggles', async () => {
  const refs = { mapping: React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, selection: ['tissue-mapped'] }), recording: React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, selection: ['neural-recording-hours', 'simultaneously-recorded-neurons', 'channel-count-frontier'] }) };
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: React.createElement('p', null, 'Idea vintage · Google Trends'), references: refs }));
  try {
    for (const term of ['Channel count frontier', 'Idea vintage', 'Markets', 'Google Trends']) {
      await search(term);
      assert.ok(visible('[data-metric-toggle]').length > 0, term);
      assert.ok(visible('[data-metric-toggle]').every(n => n.disabled));
      assert.match(document.querySelector('[role=status]').textContent, /matching categor/);
    }
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(document.querySelector('input').value, '');
    assert.equal(document.querySelectorAll('[data-metric-toggle][aria-expanded=true]').length, 7);
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
test('source definitions, raw observations, plots, caveats and provenance are byte-identical to base', () => {
  const frozen = {"src/data/draft-charts.ts": "cafa46498df5396063757e04126c7b8c6778df09b26d8f59f8cf7cb3902cb661", "src/data/draft-chart-evidence.json": "f3d0d23799262f64a45e2ccd976def811b1f545c6853cf789613d3c0973cc58e", "src/data/draft-chart-observations.ts": "d4937f5b2c4b2a559cb8d341917b27f03a4572d4c6e9c38a62257c8fd87679f9", "src/components/draft-chart-plot.tsx": "5cb1eb0a6c8bfb91f20a1d9c93096c0dcb7efe5618db30406ca3538ceb80cfea", "src/data/field-velocity/neurotech.snapshot.json": "2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee", "src/data/field-velocity/neurotech.snapshot.json.provenance.json": "66df3d351fd6318ed289b1d0e8299ad8da9a7f6399becda046d17baf49f48b97", "src/data/velocity/neurotech_records.json": "57695c0a26d8f67f092bb951740ae75991d0b5ca8174027e9b03280232494f62", "public/data/google-trends/google-trends.json": "830e31c5315f6fefa07897a264136a04f098bbf107dafab9c660d6fd989dbc36"};
  for (const [path, sha] of Object.entries(frozen)) assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), sha, path);
});
test('every canonical share link has exactly one legacy alias and an independently addressable target', () => {
  assert.equal(metricChartAnchors.length, 43);
  assert.equal(new Set([...metricChartAnchors, ...draftChartAnchors]).size, 86);
  for (const id of metricChartAnchors) assert.equal(performanceUrl('https://atlas.example/base/field-velocity?a=1&a=2', id), `https://atlas.example/base/field-velocity?a=1&a=2#${id}`);
  assert.equal(DRAFT_CHART_LINKS.length, 19);
});
