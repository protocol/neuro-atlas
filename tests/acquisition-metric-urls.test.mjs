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
// Independent inventory of published identities, not derived from the registry.
const aliases = [anchor, slug, 'estimated-acquisition-cost-per-10m-voxels-optical-and-em',
  'draft-imaging-cost-efficiency', 'metric-imaging-cost-efficiency', 'draft-panel-acquisition-economics'];
const modes = ['voxels-per-dollar', 'dollars-per-voxel'];
const base = 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b';
const selectedUrl = (query, hash = slug) => new URL(`${base}&${query}#${hash}`);
const initial = (url, state = { __NA: true, tree: ['preserved'], atlasModalFrom: null }) => win => {
  win.history.replaceState(state, '', url);
};
const token = metric => metric === 'dollars-per-voxel' ? metric : null;
function MetricProbe({ target = anchor }) {
  const [metric, setMetric] = navigation.useAcquisitionMetric(target);
  const [reference, setReference] = navigation.useChartToggle(target);
  return React.createElement('section', null,
    React.createElement('output', null, metric),
    ...modes.map(value => React.createElement('button', { key: value, 'data-select': value, onClick: () => setMetric(value) }, value)),
    React.createElement('button', { 'data-budget': true, onClick: () => setReference(value => !value) }, String(reference)),
    React.createElement(DraftChartShare, { anchor: target, label: 'Acquisition URL fixture' }));
}
const probe = () => React.createElement(React.StrictMode, null, React.createElement(MetricProbe));
async function traverse(direction, href) {
  await act(async () => window.history[direction]());
  for (let i = 0; i < 30 && window.location.href !== href; i++) await settle();
  assert.equal(window.location.href, href, 'history traversal settled');
}

test('only two quantities parse across all acquisition aliases; unpublished human-brain and malformed tokens fail closed', () => {
  for (const hash of aliases) for (const target of aliases) for (const metric of modes) {
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl(`acquisitionMetric=${metric}`, hash), target), metric);
  }
  for (const query of ['', 'acquisitionMetric=', 'acquisitionMetric=unknown', 'acquisitionMetric=human-brain',
    'acquisitionMetric=VOXELS-PER-DOLLAR', 'acquisitionMetric=%20voxels-per-dollar',
    'acquisitionMetric=voxels-per-dollar&acquisitionMetric=voxels-per-dollar',
    'acquisitionMetric=voxels-per-dollar&acquisitionMetric=dollars-per-voxel',
    'acquisitionMetric=human-brain&acquisitionMetric=voxels-per-dollar']) {
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl(query), anchor), 'voxels-per-dollar', query);
  }
  for (const other of ['metrics', 'tissue-mapped', 'metric-panel-public-data-size', 'unknown', '']) {
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl('acquisitionMetric=dollars-per-voxel', other), anchor), 'voxels-per-dollar');
    assert.equal(chartState.acquisitionMetricFromUrl(selectedUrl('acquisitionMetric=dollars-per-voxel'), other), 'voxels-per-dollar');
  }
});

test('navigation preserves aliases and duplicate unrelated state but clears reciprocal reference and invalid/default quantity tokens', () => {
  for (const metric of modes) for (const hash of aliases) {
    const current = selectedUrl(`brainScale=acquisition-economics&acquisitionMetric=${metric}`, hash);
    const own = new URL(navigation.performanceUrl(current.href, anchor));
    assert.equal(own.searchParams.get('acquisitionMetric'), token(metric));
    assert.equal(own.searchParams.get('brainScale'), metric === 'voxels-per-dollar' ? 'acquisition-economics' : null);
    assert.equal(own.hash, `#${slug}`);
    assert.deepEqual(own.searchParams.getAll('ref'), ['a', 'b']);
    for (const target of ['metric-panel-public-data-size', 'tissue-mapped', 'performance_curves']) {
      assert.equal(new URL(navigation.performanceUrl(current.href, target)).searchParams.has('acquisitionMetric'), false);
    }
  }
  for (const query of ['acquisitionMetric=human-brain', 'acquisitionMetric=unknown', 'acquisitionMetric=',
    'acquisitionMetric=dollars-per-voxel&acquisitionMetric=dollars-per-voxel']) {
    const cleaned = new URL(navigation.performanceUrl(selectedUrl(`brainScale=acquisition-economics&${query}`).href, anchor));
    assert.equal(cleaned.searchParams.has('acquisitionMetric'), false);
    assert.equal(cleaned.searchParams.get('brainScale'), 'acquisition-economics');
    assert.deepEqual(cleaned.searchParams.getAll('ref'), ['a', 'b']);
  }
  const foreign = selectedUrl('brainScale=public-data-size&acquisitionMetric=dollars-per-voxel', 'selected-public-image-resource-footprints');
  assert.equal(new URL(navigation.performanceUrl(foreign.href, anchor)).searchParams.has('acquisitionMetric'), false);
});

test('pure quantity updater omits default and clears the reference only when choosing reciprocal', () => {
  for (const reference of [false, true]) for (const hash of aliases) for (const metric of modes) {
    const current = selectedUrl(`${reference ? 'brainScale=acquisition-economics&' : ''}acquisitionMetric=unknown`, hash).href;
    const updated = new URL(navigation.acquisitionMetricUrl(current, anchor, metric));
    assert.equal(updated.searchParams.get('acquisitionMetric'), token(metric));
    assert.equal(updated.searchParams.getAll('acquisitionMetric').length, token(metric) ? 1 : 0);
    assert.equal(updated.searchParams.get('brainScale'), reference && metric === 'voxels-per-dollar' ? 'acquisition-economics' : null);
    assert.deepEqual(updated.searchParams.getAll('ref'), ['a', 'b']);
    assert.equal(updated.hash, `#${slug}`);
    assert.equal(updated.pathname, '/neuro-atlas/field-velocity');
    assert.equal(navigation.acquisitionMetricUrl(current, anchor, 'human-brain').includes('acquisitionMetric='), false);
  }
});

test('quantity hook preserves router state, Back/Forward and fresh reload without enabling reference', async () => {
  let cleanup = await mount(probe(), '', initial(`${base}#${slug}`));
  try {
    const original = window.location.href;
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
    await click(document.querySelector('[data-select=dollars-per-voxel]'));
    const cost = window.location.href;
    assert.equal(new URL(cost).searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.equal(document.querySelector('[data-budget]').textContent, 'false');
    assert.deepEqual(new URL(cost).searchParams.getAll('ref'), ['a', 'b']);
    assert.deepEqual(window.history.state, { __NA: true, tree: ['preserved'], atlasModalFrom: null });
    await click(document.querySelector('[data-select=voxels-per-dollar]'));
    assert.equal(window.location.href, original);
    assert.equal(window.history.length, 3);
    await traverse('back', cost);
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    await traverse('back', original);
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
    await traverse('forward', cost);
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    await cleanup(); cleanup = undefined;
    cleanup = await mount(probe(), '', initial(cost));
    assert.equal(document.querySelector('output').textContent, 'dollars-per-voxel');
    assert.equal(window.history.length, 1);
  } finally { if (cleanup) await cleanup(); }
});

test('native Copy link success and fallback share current quantity and restore fresh recipients', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let denied = false, copied, writes = 0, cleanup;
  try {
    cleanup = await mount(probe(), '', initial(`${base}#${slug}`));
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => {
      writes++; if (denied) throw new Error('Clipboard denied'); copied = text;
    } } } });
    await click(document.querySelector('[data-select=dollars-per-voxel]'));
    await click(document.querySelector('[data-copy-draft-link]'));
    assert.equal(copied, window.location.href);
    assert.equal(new URL(copied).searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.deepEqual(new URL(copied).searchParams.getAll('ref'), ['a', 'b']);
    assert.equal(document.querySelector('[role=status]').textContent, 'Copied');
    await click(document.querySelector('[data-select=voxels-per-dollar]'));
    assert.equal(document.querySelector('[role=status]').textContent, '');
    assert.equal(writes, 1);
    denied = true;
    await click(document.querySelector('[data-copy-draft-link]'));
    const fallback = document.querySelector('.chart-link-fallback input').value;
    assert.equal(fallback, window.location.href);
    assert.equal(new URL(fallback).searchParams.has('acquisitionMetric'), false);
    await cleanup(); cleanup = undefined;
    cleanup = await mount(probe(), '', initial(fallback));
    assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
  } finally {
    if (cleanup) await cleanup();
    if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
  }
});

test('export links omit default/unpublished human mode and never carry reciprocal reference state or private query data', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300"><circle cx="100" cy="200" r="5"/></svg>');
  try {
    for (const metric of [...modes, 'human-brain']) for (const reference of [false, true]) {
      const current = selectedUrl(`token=private&recordingView=optical&acquisitionMetric=${metric}${reference ? '&brainScale=acquisition-economics' : ''}`);
      current.username = 'private'; current.password = 'secret';
      const exported = new URL(chartShareUrl(current.href, anchor));
      assert.equal(exported.searchParams.get('acquisitionMetric'), token(metric));
      assert.equal(exported.searchParams.get('brainScale'), reference && metric !== 'dollars-per-voxel' ? 'acquisition-economics' : null);
      assert.deepEqual([...exported.searchParams.keys()].sort(), [
        ...(token(metric) ? ['acquisitionMetric'] : []), ...(reference && metric !== 'dollars-per-voxel' ? ['brainScale'] : []),
      ].sort());
      assert.equal(exported.username, ''); assert.equal(exported.password, '');
      assert.equal(exported.pathname, '/neuro-atlas/field-velocity');
      assert.equal(exported.hash, `#${slug}`);
      const image = buildChartImage({ svg: dom.window.document.querySelector('svg'), title: 'Quantity fixture', anchor, notes: [] }, current.href);
      assert.equal(image.url, exported.href);
      const parsed = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
      try { assert.ok(parsed.window.document.querySelector('[data-export-footer]').textContent.includes(exported.href)); }
      finally { parsed.window.close(); }
      assert.doesNotMatch(image.svg, /secret|private|token=|recordingView=|ref=/);
      for (const other of ['metric-panel-public-data-size', 'performance_curves']) {
        assert.equal(new URL(chartShareUrl(current.href, other)).searchParams.has('acquisitionMetric'), false);
      }
    }
  } finally { dom.window.close(); }
});

test('fresh aliases restore quantities and eligible reference; hash-only navigation cannot leak units', async () => {
  for (const hash of aliases) for (const metric of modes) {
    const state = { __NA: true, tree: ['preserved'], atlasModalFrom: null };
    const cleanup = await mount(probe(), '', initial(selectedUrl(`brainScale=acquisition-economics&acquisitionMetric=${metric}`, hash).href, state));
    try {
      assert.equal(document.querySelector('output').textContent, metric);
      assert.equal(document.querySelector('[data-budget]').textContent, String(metric === 'voxels-per-dollar'));
      assert.equal(window.location.hash, `#${slug}`);
      assert.equal(window.history.length, 1);
      assert.deepEqual(window.history.state, state);
      const own = window.location.href;
      await act(async () => { window.location.hash = 'selected-public-image-resource-footprints'; });
      await settle();
      assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
      assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'), false);
      assert.equal(window.history.length, 2);
      await traverse('back', own);
      assert.equal(document.querySelector('output').textContent, metric);
    } finally { await cleanup(); }
  }
});

test('reselecting current canonical quantity does not change exact URL, history or modal origin', async () => {
  for (const metric of modes) {
    const current = `${base}${metric === 'dollars-per-voxel' ? '&acquisitionMetric=dollars-per-voxel' : '&brainScale=acquisition-economics'}#${slug}`;
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

test('fresh invalid or unpublished/default links sanitize without extra history or router-state loss', async () => {
  for (const hash of aliases) for (const query of ['acquisitionMetric=human-brain', 'acquisitionMetric=unknown',
    'acquisitionMetric=voxels-per-dollar', 'acquisitionMetric=', 'acquisitionMetric=dollars-per-voxel&acquisitionMetric=dollars-per-voxel']) {
    const state = { __NA: true, tree: ['preserved'], atlasModalFrom: null };
    const cleanup = await mount(probe(), '', initial(selectedUrl(`brainScale=acquisition-economics&${query}`, hash).href, state));
    try {
      assert.equal(document.querySelector('output').textContent, 'voxels-per-dollar');
      assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'), false);
      assert.equal(document.querySelector('[data-budget]').textContent, 'true');
      assert.equal(window.location.hash, `#${slug}`);
      assert.deepEqual(new URL(window.location.href).searchParams.getAll('ref'), ['a', 'b']);
      assert.deepEqual(window.history.state, state);
      assert.equal(window.history.length, 1);
    } finally { await cleanup(); }
  }
});
