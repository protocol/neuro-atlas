import test from 'node:test';
import assert from 'node:assert/strict';
import * as chartState from '../src/lib/chart-toggle-url.ts';
import * as navigation from '../src/lib/field-velocity/navigation.ts';
import React, { act } from 'react';
import { mount, click, settle } from './modal-helpers.mjs';
import { JSDOM } from 'jsdom';
import { buildChartImage, chartShareUrl } from '../src/lib/chart-export.ts';
import { DraftChartShare } from '../src/components/draft-chart-share.tsx';

globalThis.React = React;

const anchor = 'metric-panel-acquisition-economics';
const slug = 'estimated-acquisition-efficiency-voxels-per-dollar';
// Published aliases are an independent compatibility inventory, not derived from the registry.
const aliases = [anchor, slug, 'estimated-acquisition-cost-per-10m-voxels-optical-and-em',
  'draft-imaging-cost-efficiency', 'metric-imaging-cost-efficiency',
  'draft-panel-acquisition-economics'];
const base = 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b';
const selectedUrl = (query, hash = slug) => new URL(`${base}&${query}#${hash}`);
const initial = (url, state = { __NA: true, tree: ['preserved'], atlasModalFrom: `${base}#metrics` }) => win => {
  win.history.replaceState(state, '', url);
};
function MetricProbe({ target = anchor }) {
  const [metric, setMetric] = navigation.useAcquisitionMetric(target);
  const [budget, setBudget] = navigation.useChartToggle(target);
  return React.createElement('section', { 'data-probe': target },
    React.createElement('output', { 'data-metric': true }, metric),
    ...['voxels-per-dollar', 'dollars-per-voxel', 'human-brain'].map(value =>
      React.createElement('button', { key: value, 'data-select': value, onClick: () => setMetric(value) }, value)),
    React.createElement('button', { 'data-budget': true, onClick: () => setBudget(value => !value) }, String(budget)),
    React.createElement(DraftChartShare, { anchor: target, label: 'Acquisition URL fixture' }));
}
const probe = () => React.createElement(React.StrictMode, null, React.createElement(MetricProbe));
async function traverse(direction, href) {
  await act(async () => window.history[direction]());
  for (let i = 0; i < 30 && window.location.href !== href; i++) await settle();
  assert.equal(window.location.href, href, 'history traversal settled');
}

test('acquisition metric parsing restores exact modes only for the acquisition chart and all its legacy aliases', () => {
  for (const hash of aliases) for (const target of aliases) {
    for (const metric of ['voxels-per-dollar', 'dollars-per-voxel', 'human-brain']) {
      assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl(`acquisitionMetric=${metric}`, hash), target), metric);
    }
  }
  for (const query of ['', 'acquisitionMetric=', 'acquisitionMetric=unknown',
    'acquisitionMetric=VOXELS-PER-DOLLAR', 'acquisitionMetric=%20voxels-per-dollar',
    'acquisitionMetric=voxels-per-dollar&acquisitionMetric=voxels-per-dollar',
    'acquisitionMetric=voxels-per-dollar&acquisitionMetric=dollars-per-voxel',
    'acquisitionMetric=human-brain&acquisitionMetric=voxels-per-dollar']) {
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl(query), anchor), 'human-brain', query);
  }
  for (const other of ['metrics', 'tissue-mapped', 'metric-panel-public-data-size', 'unknown', '']) {
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl('acquisitionMetric=voxels-per-dollar', other), anchor), 'human-brain', other);
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl('acquisitionMetric=voxels-per-dollar'), other), 'human-brain', other);
  }
});

test('chart navigation sanitizes acquisition metric selection without dropping benchmark or repeated unrelated state', () => {
  for (const metric of ['voxels-per-dollar', 'dollars-per-voxel']) for (const hash of aliases) {
    const current = selectedUrl(`brainScale=acquisition-economics&acquisitionMetric=${metric}`, hash);
    const own = new URL(navigation.performanceUrl(current.href, anchor));
    assert.equal(own.searchParams.get('acquisitionMetric'), metric);
    assert.equal(own.searchParams.get('brainScale'), 'acquisition-economics');
    assert.equal(own.hash, `#${slug}`);
    assert.deepEqual(own.searchParams.getAll('ref'), ['a', 'b']);
    for (const target of ['metric-panel-public-data-size', 'tissue-mapped', 'performance_curves']) {
      assert.equal(new URL(navigation.performanceUrl(current.href, target)).searchParams.has('acquisitionMetric'), false, target);
    }
  }
  for (const query of ['acquisitionMetric=human-brain', 'acquisitionMetric=unknown', 'acquisitionMetric=',
    'acquisitionMetric=dollars-per-voxel&acquisitionMetric=dollars-per-voxel']) {
    const current = selectedUrl(`brainScale=acquisition-economics&${query}`);
    const cleaned = new URL(navigation.performanceUrl(current.href, anchor));
    assert.equal(cleaned.searchParams.has('acquisitionMetric'), false, query);
    assert.equal(cleaned.searchParams.get('brainScale'), 'acquisition-economics');
    assert.deepEqual(cleaned.searchParams.getAll('ref'), ['a', 'b']);
  }
  const foreign = selectedUrl('brainScale=public-data-size&acquisitionMetric=voxels-per-dollar', 'selected-public-image-resource-footprints');
  const opened = new URL(navigation.performanceUrl(foreign.href, anchor));
  assert.equal(opened.searchParams.has('acquisitionMetric'), false, 'a foreign chart cannot leak a metric into acquisition');
});

test('the pure acquisition metric updater omits the default and preserves independent default-off benchmark state', () => {
  for (const budget of ['', 'brainScale=acquisition-economics&']) for (const hash of aliases) {
    const current = selectedUrl(`${budget}acquisitionMetric=unknown&acquisitionMetric=voxels-per-dollar`, hash).href;
    for (const metric of ['voxels-per-dollar', 'dollars-per-voxel', 'human-brain']) {
      const updated = new URL(navigation.acquisitionMetricUrl(current, anchor, metric));
      assert.equal(updated.searchParams.get('acquisitionMetric'), metric === 'human-brain' ? null : metric);
      assert.equal(updated.searchParams.getAll('acquisitionMetric').length, metric === 'human-brain' ? 0 : 1);
      assert.equal(updated.searchParams.get('brainScale'), budget ? 'acquisition-economics' : null);
      assert.deepEqual(updated.searchParams.getAll('ref'), ['a', 'b']);
      assert.equal(updated.hash, `#${slug}`);
      assert.equal(updated.pathname, '/neuro-atlas/field-velocity');
    }
    assert.equal(navigation.acquisitionMetricUrl(current, anchor, 'unknown').includes('acquisitionMetric='), false);
    for (const other of ['metric-panel-public-data-size', 'performance_curves']) {
      assert.equal(new URL(navigation.acquisitionMetricUrl(current, other, 'voxels-per-dollar')).searchParams.has('acquisitionMetric'), false);
    }
  }
});

test('the acquisition hook records metric history, restores Back/Forward and fresh documents without enabling budgets', async () => {
  let cleanup = await mount(probe(), '', initial(`${base}#${slug}`));
  try {
    const original = window.location.href;
    assert.equal(document.querySelector('output').textContent, 'human-brain');
    await click(document.querySelector('[data-select="voxels-per-dollar"]'));
    const efficiency = window.location.href;
    assert.equal(new URL(efficiency).searchParams.get('acquisitionMetric'), 'voxels-per-dollar');
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
    assert.equal(document.querySelector('[data-budget]').textContent, 'false');
    assert.equal(new URL(efficiency).searchParams.has('brainScale'), false);
    assert.deepEqual(new URL(efficiency).searchParams.getAll('ref'), ['a', 'b']);
    assert.deepEqual(window.history.state, { __NA: true, tree: ['preserved'], atlasModalFrom: null });
    await click(document.querySelector('[data-select="dollars-per-voxel"]'));
    const cost = window.location.href;
    await click(document.querySelector('[data-select="human-brain"]'));
    assert.equal(window.location.href, original, 'default omits metric token');
    assert.equal(window.history.length, 4);
    await traverse('back', cost);
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    await traverse('back', efficiency);
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
    await traverse('forward', cost);
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    await cleanup(); cleanup = undefined;
    cleanup = await mount(probe(), '', initial(cost));
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    assert.equal(window.history.length, 1, 'restoration must not push history');
  } finally { if (cleanup) await cleanup(); }
});

test('native Copy link success and fallback share the current metric and restore it for fresh recipients', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let denied = false, copied, writes = 0, cleanup;
  try {
    cleanup = await mount(probe(), '', initial(`${base}#${slug}`));
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => {
      writes++; if (denied) throw new Error('Clipboard denied'); copied = text;
    } } } });
    await click(document.querySelector('[data-select="dollars-per-voxel"]'));
    await click(document.querySelector('[data-copy-draft-link]'));
    assert.equal(copied, window.location.href);
    assert.equal(new URL(copied).searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.deepEqual(new URL(copied).searchParams.getAll('ref'), ['a', 'b']);
    assert.equal(document.querySelector('[role=status]').textContent, 'Copied');
    await click(document.querySelector('[data-select="voxels-per-dollar"]'));
    assert.equal(document.querySelector('[role=status]').textContent, '', 'metric changes invalidate prior clipboard feedback');
    assert.equal(writes, 1, 'selecting units never copies automatically');
    denied = true;
    await click(document.querySelector('[data-copy-draft-link]'));
    const fallback = document.querySelector('.chart-link-fallback input').value;
    assert.equal(fallback, window.location.href);
    await cleanup(); cleanup = undefined;
    cleanup = await mount(probe(), '', initial(fallback));
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
    await click(document.querySelector('[data-select="human-brain"]'));
    await click(document.querySelector('[data-copy-draft-link]'));
    assert.equal(new URL(document.querySelector('.chart-link-fallback input').value).searchParams.has('acquisitionMetric'), false);
  } finally {
    if (cleanup) await cleanup();
    if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
  }
});

test('export URL and generated image footer retain only the selected acquisition metric and optional budget token', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300"><circle data-value="42" cx="100" cy="200" r="5"/></svg>');
  try {
    const svg = dom.window.document.querySelector('svg');
    for (const metric of ['voxels-per-dollar', 'dollars-per-voxel', 'human-brain']) for (const budget of [false, true]) {
      const current = selectedUrl(`token=private&recordingView=optical&acquisitionMetric=${metric}${budget ? '&brainScale=acquisition-economics' : ''}`);
      current.username = 'private'; current.password = 'secret';
      const exported = new URL(chartShareUrl(current.href, anchor));
      assert.equal(exported.searchParams.get('acquisitionMetric'), metric === 'human-brain' ? null : metric);
      assert.equal(exported.searchParams.get('brainScale'), budget ? 'acquisition-economics' : null);
      assert.deepEqual([...exported.searchParams.keys()].sort(), [
        ...(metric === 'human-brain' ? [] : ['acquisitionMetric']), ...(budget ? ['brainScale'] : []),
      ].sort());
      assert.equal(exported.username, ''); assert.equal(exported.password, '');
      assert.equal(exported.pathname, '/neuro-atlas/field-velocity');
      assert.equal(exported.hash, `#${slug}`);
      const image = buildChartImage({ svg, title: 'Acquisition metric URL fixture', anchor, notes: [] }, current.href);
      assert.equal(image.url, exported.href);
      const parsed = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
      try { assert.ok(parsed.window.document.querySelector('[data-export-footer]').textContent.includes(exported.href)); }
      finally { parsed.window.close(); }
      assert.doesNotMatch(image.svg, /secret|private|token=|recordingView=|ref=/);
      for (const other of ['metric-panel-public-data-size', 'performance_curves']) {
        assert.equal(new URL(chartShareUrl(current.href, other)).searchParams.has('acquisitionMetric'), false);
      }
    }
    for (const query of ['acquisitionMetric=unknown', 'acquisitionMetric=',
      'acquisitionMetric=voxels-per-dollar&acquisitionMetric=voxels-per-dollar']) {
      assert.equal(new URL(chartShareUrl(selectedUrl(query).href, anchor)).search, '');
    }
  } finally { dom.window.close(); }
});

test('fresh valid aliases restore metric and budget independently, and hash-only navigation cannot leak units', async () => {
  for (const hash of aliases) for (const metric of ['voxels-per-dollar', 'dollars-per-voxel']) {
    const state = { __NA: true, tree: ['preserved'], atlasModalFrom: null };
    const cleanup = await mount(probe(), '', initial(selectedUrl(`brainScale=acquisition-economics&acquisitionMetric=${metric}`, hash).href, state));
    try {
      assert.equal(document.querySelector('output').textContent, metric);
      assert.equal(document.querySelector('[data-budget]').textContent, 'true');
      assert.equal(window.location.hash, `#${slug}`);
      assert.equal(window.history.length, 1);
      assert.deepEqual(window.history.state, state);
      await click(document.querySelector('[data-budget]'));
      const budgetOff = window.location.href;
      assert.equal(new URL(budgetOff).searchParams.get('acquisitionMetric'), metric);
      assert.equal(document.querySelector('[data-budget]').textContent, 'false');
      await act(async () => { window.location.hash = 'selected-public-image-resource-footprints'; });
      await settle();
      assert.equal(document.querySelector('output').textContent, 'human-brain');
      assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'), false);
      assert.equal(window.history.length, 3, 'hash sanitization only replaces the new entry');
      await traverse('back', budgetOff);
      assert.equal(document.querySelector('output').textContent, metric);
      assert.equal(document.querySelector('[data-budget]').textContent, 'false');
    } finally { await cleanup(); }
  }
});

test('reselecting the current acquisition metric is a no-op for the exact URL, history and modal origin', async () => {
  for (const metric of ['voxels-per-dollar', 'dollars-per-voxel', 'human-brain']) {
    const current = selectedUrl(`${metric === 'human-brain' ? '' : `acquisitionMetric=${metric}&`}brainScale=acquisition-economics`).href;
    assert.equal(navigation.acquisitionMetricUrl(current, anchor, metric), current);
    const state = { __NA: true, tree: ['preserved'], atlasModalFrom: `${base}#metrics` };
    const cleanup = await mount(probe(), '', initial(current, state));
    try {
      await click(document.querySelector(`[data-select="${metric}"]`));
      assert.equal(window.location.href, current);
      assert.equal(window.history.length, 1);
      assert.deepEqual(window.history.state, state);
    } finally { await cleanup(); }
  }
});

test('fresh legacy and canonical metric links replace invalid/default query state without adding history or changing router state', async () => {
  for (const hash of aliases) for (const query of ['acquisitionMetric=human-brain', 'acquisitionMetric=unknown',
    'acquisitionMetric=', 'acquisitionMetric=dollars-per-voxel&acquisitionMetric=dollars-per-voxel']) {
    const state = { __NA: true, tree: ['preserved'], atlasModalFrom: null };
    const cleanup = await mount(probe(), '', initial(selectedUrl(`brainScale=acquisition-economics&${query}`, hash).href, state));
    try {
      assert.equal(document.querySelector('output').textContent, 'human-brain');
      assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'), false, `${hash}: ${query}`);
      assert.equal(document.querySelector('[data-budget]').textContent, 'true');
      assert.equal(window.location.hash, `#${slug}`);
      assert.deepEqual(new URL(window.location.href).searchParams.getAll('ref'), ['a', 'b']);
      assert.deepEqual(window.history.state, state);
      assert.equal(window.history.length, 1);
    } finally { await cleanup(); }
  }
});
