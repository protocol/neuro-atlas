import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click, settle } from './modal-helpers.mjs';
import { performanceUrl } from '../src/lib/field-velocity/navigation.ts';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { readFileSync } from 'node:fs';
import { chartShareUrl } from '../src/lib/chart-export.ts';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const hours = () => React.createElement(PerformanceCurves, { data, provenance, flat: true, selection: ['neural-recording-hours'] });

// Independent inventory of existing component boolean switches (not theme,
// consent, disclosures, tracks, or the already-addressed recording view).
// Current FieldVelocityPage mounts only the two benchmark switches. The hours
// extrapolation path is legacy/component-only; this does not add it to the page.
globalThis.React = React;
test('chart link construction retains only the selected chart toggle, while preserving repeated unrelated queries', () => {
  const original = 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b&brainScale=public-data-size#draft-panel-public-data-size';
  const own = new URL(performanceUrl(original, 'metric-panel-public-data-size'));
  assert.equal(own.searchParams.get('brainScale'), 'public-data-size');
  for (const target of ['metric-panel-acquisition-economics', 'neural-recording-hours', 'performance_curves']) {
    const other = new URL(performanceUrl(original, target));
    assert.equal(other.searchParams.has('brainScale'), false, target);
    assert.equal(other.pathname, '/neuro-atlas/field-velocity');
    assert.deepEqual(other.searchParams.getAll('ref'), ['a', 'b']);
  }
});
test('image-export links retain the exact selected toggle but never arbitrary queries or credentials', () => {
  for (const [anchor, query, value] of [
    ['metric-panel-public-data-size', 'brainScale', 'public-data-size'],
    ['metric-panel-acquisition-economics', 'brainScale', 'acquisition-economics'],
    ['neural-recording-hours', 'extrapolation', 'neural-recording-hours'],
  ]) {
    const current = `https://private:secret@atlas.example/neuro-atlas/field-velocity?token=private&ref=a&ref=b&recordingView=optical&${query}=${value}#${anchor}`;
    const exported = new URL(chartShareUrl(current, anchor));
    const slug = (fieldVelocityGraph(anchor)).slug;
    assert.equal(exported.searchParams.get('chartModel'), `${slug}:${query === 'brainScale' ? 'brain-scale' : 'fit'}`);
    assert.equal(exported.username, '');
    assert.equal(exported.password, '');
    assert.equal(exported.pathname, `/neuro-atlas/field-velocity/${slug}`);
    for (const suffix of [`${value}&${query}=${value}`, '', '0', '%3Cscript%3E']) {
      const invalid = current.replace(`${query}=${value}`, `${query}=${suffix}`);
      assert.equal(new URL(chartShareUrl(invalid, anchor)).search, '');
    }
    assert.equal(new URL(chartShareUrl(current, 'tissue-mapped')).search, '');
  }
  const recording = chartShareUrl('https://atlas.example/neuro-atlas/field-velocity?token=private&brainScale=public-data-size&recordingView=optical#simultaneously-recorded-neurons', 'simultaneously-recorded-neurons');
  assert.equal(new URL(recording).search, '?recordingView=optical');
});

test('hours Extrapolation changes the URL and a fresh document restores the selected switch', async () => {
  let cleanup = await mount(hours(), '#neural-recording-hours', win => {
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  });
  try {
    await click(document.querySelector('dialog [role=switch]'));
    assert.equal(new URL(window.location.href).searchParams.get('extrapolation'), 'neural-recording-hours');
    const recipientUrl = window.location.href;
    await cleanup(); cleanup = undefined;
    cleanup = await mount(hours(), '', win => {
      win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
      win.history.replaceState({ router: 'retained' }, '', recipientUrl);
    });
    assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'true');
    assert.ok(document.querySelector('dialog [data-extrapolation-line]'));
    await click(document.querySelector('dialog [role=switch]'));
    assert.equal(new URL(window.location.href).searchParams.has('extrapolation'), false);
    assert.equal(document.querySelector('dialog [data-extrapolation-line]'), null);
    assert.deepEqual(window.history.state.router, 'retained');
  } finally { if (cleanup) await cleanup(); }
});

const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(item => item.plots);
const panel = id => React.createElement(DraftChartPanel, {
  anchor: `metric-panel-${id}`, plot: plots.find(plot => plot.id === id),
});
const configure = win => {
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  win.history.replaceState({ router: { tree: 'preserved' }, atlasModalFrom: 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b#metrics' }, '',
    'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b#draft-panel-public-data-size');
};

test('Whole-brain scale changes the address bar and switching off restores the original URL and SVG', async () => {
  const cleanup = await mount(panel('public-data-size'), '', configure);
  try {
    const toggle = document.querySelector('dialog [role=switch]');
    const svg = document.querySelector('dialog svg').outerHTML;
    const original = window.location.href;
    await click(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    const selected = new URL(window.location.href);
    assert.equal(selected.searchParams.get('brainScale'), 'public-data-size');
    assert.equal(selected.hash, '#selected-public-image-resource-footprints');
    assert.equal(selected.pathname, '/neuro-atlas/field-velocity');
    assert.deepEqual(selected.searchParams.getAll('ref'), ['a', 'b']);
    assert.deepEqual(window.history.state.router, { tree: 'preserved' });
    await click(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.equal(window.location.href, original);
    assert.equal(document.querySelector('dialog svg').outerHTML, svg);
  } finally { await cleanup(); }
});

const switches = [
  { id: 'public-data-size', anchor: 'metric-panel-public-data-size', slug: 'selected-public-image-resource-footprints', query: 'brainScale', aliases: ['draft-open-access-data', 'draft-panel-public-data-size', 'metric-open-access-data'] },
  { id: 'acquisition-economics', anchor: 'metric-panel-acquisition-economics', slug: 'estimated-acquisition-efficiency-voxels-per-dollar', query: 'brainScale', aliases: ['draft-imaging-cost-efficiency', 'metric-panel-acquisition-economics', 'estimated-acquisition-cost-per-10m-voxels-optical-and-em'] },
  { id: 'neural-recording-hours', anchor: 'neural-recording-hours', slug: 'neural-recording-hours-selected-datasets', query: 'extrapolation', aliases: ['neural-recording-hours', 'draft-recording-hours', 'draft-panel-tusz-scalp-eeg'] },
];
const allCharts = () => React.createElement(React.StrictMode, null,
  panel('public-data-size'), panel('acquisition-economics'), hours());
const base = 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b';
const initial = (url, state = { router: { tree: 'preserved' } }) => win => {
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  win.history.replaceState(state, '', url);
};
async function until(predicate) {
  for (let i = 0; i < 30 && !predicate(); i++) await settle();
  assert.ok(predicate(), 'URL-selected modal state settled');
}
async function traverse(direction, href) {
  await act(async () => window.history[direction]());
  await until(() => window.location.href === href);
}

for (const item of switches) {
  test(`${item.id}: fresh canonical and legacy links restore only their own switch without adding history`, async () => {
    for (const anchor of [item.slug, ...item.aliases]) {
      const state = { __NA: true, router: ['retained'], atlasModalFrom: null };
      const cleanup = await mount(allCharts(), '', initial(`${base}&${item.query}=${item.id}#${anchor}`, state));
      try {
        assert.equal(window.history.length, 1, 'legacy normalization must replace, not push');
        assert.equal(window.location.hash, `#${item.slug}`);
        assert.deepEqual(window.history.state, state);
        assert.equal(document.querySelectorAll('dialog[open]').length, 1);
        assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'true');
        assert.equal(document.querySelectorAll('[data-draft-preview] [role=switch], .pc-preview [role=switch]').length, 0);
      } finally { await cleanup(); }
    }
  });

  test(`${item.id}: Back/Forward restores toggle history and chart-to-chart navigation is isolated`, async () => {
    const cleanup = await mount(allCharts(), '', initial(`${base}#metrics`));
    try {
      const trigger = item.query === 'extrapolation'
        ? document.querySelector(`[data-performance-card="${item.anchor}"] .pc-trigger`)
        : document.querySelector(`[data-draft-popout-trigger="${item.anchor}"]`);
      await click(trigger);
      const off = window.location.href;
      await click(document.querySelector('dialog [role=switch]'));
      const on = window.location.href;
      assert.equal(window.history.length, 3, 'one entry each for modal open and toggle');
      assert.equal(window.history.state.atlasModalFrom, null, 'Close must not back into another view of the same modal');
      assert.deepEqual(window.history.state.router, { tree: 'preserved' });
      await traverse('back', off);
      assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'false');
      await traverse('forward', on);
      assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'true');
      for (const other of switches.filter(value => value.id !== item.id)) {
        const link = performanceUrl(window.location.href, other.anchor);
        assert.equal(new URL(link).searchParams.has(item.query), false);
      }
      // A native hash-only link retains the query string. A chart-qualified
      // token must still never enable the other benchmark on that path.
      const other = switches.find(value => value.id !== item.id);
      await act(async () => { window.location.hash = other.slug; });
      await until(() => window.location.hash === `#${other.slug}` && document.querySelector('dialog [role=switch]')?.getAttribute('aria-checked') === 'false');
      await traverse('back', on);
      assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'true');
    } finally { await cleanup(); }
  });

  test(`${item.id}: Copy link success/fallback shares standalone state without navigating and fresh recipients restore it`, async () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let denied = false, copied, attempts = 0, cleanup;
    try {
      cleanup = await mount(allCharts(), '', initial(`${base}#${item.slug}`));
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => {
        attempts++; if (denied) throw new Error('Clipboard denied'); copied = text;
      } } } });
      await click(document.querySelector('dialog [role=switch]'));
      const sender = window.location.href;
      const length = window.history.length;
      const state = window.history.state;
      const model = item.query === 'brainScale' ? 'brain-scale' : 'fit';
      const expected = `https://atlas.example/neuro-atlas/field-velocity/${item.slug}?chartModel=${encodeURIComponent(`${item.slug}:${model}`)}&utm_source=neuro_atlas&utm_medium=share&utm_campaign=chart_share&utm_content=${item.slug}`;
      await click(document.querySelector('dialog [data-copy-draft-link]'));
      assert.equal(copied, expected);
      assert.equal(window.location.href, sender, 'Copy never navigates its sender');
      assert.equal(window.history.length, length);
      assert.deepEqual(window.history.state, state);
      assert.deepEqual(new URL(copied).searchParams.getAll('ref'), []);
      assert.equal(new URL(copied).hash, '');
      assert.equal(document.querySelector('dialog [data-copy-draft-link]').parentElement.querySelector('[role=status]').textContent, 'Copied');
      await click(document.querySelector('dialog [role=switch]'));
      assert.equal(document.querySelector('dialog [data-copy-draft-link]').parentElement.querySelector('[role=status]').textContent, '');
      assert.equal(attempts, 1, 'toggling never writes to the clipboard');
      await click(document.querySelector('dialog [role=switch]'));
      denied = true;
      await click(document.querySelector('dialog [data-copy-draft-link]'));
      const fallback = document.querySelector('dialog .chart-link-fallback input').value;
      assert.equal(fallback, expected);
      assert.equal(window.location.href, sender, 'Denied clipboard never navigates its sender');
      assert.equal(window.history.length, length + 2, 'Only the two intervening toggle changes add history');
      await cleanup(); cleanup = undefined;
      cleanup = await mount(React.createElement(FieldVelocityGraphDetail, { entry: fieldVelocityGraph(item.anchor) }), '', initial(fallback));
      const restored = document.querySelector(item.query === 'brainScale' ? '[data-brain-scale-toggle]' : '[role=switch]');
      assert.equal(restored.getAttribute('aria-checked'), 'true');
      assert.equal(window.location.href, fallback);
      assert.equal(window.history.length, 1);
    } finally {
      if (cleanup) await cleanup();
      if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
    }
  });

  for (const count of [1, 3]) for (const method of ['Close', 'Escape']) test(`${item.id}: ${method} dismisses in one action after ${count} toggle changes`, async () => {
    const cleanup = await mount(allCharts(), '', initial(`${base}#metrics`));
    try {
      await act(async () => {
        const url = performanceUrl(window.location.href, item.anchor);
        window.history.pushState({ ...window.history.state, atlasModalFrom: window.location.href }, '', url);
        window.dispatchEvent(new Event('atlas-performance-location'));
      });
      for (let i = 0; i < count; i++) await click(document.querySelector('dialog [role=switch]'));
      const dialog = document.querySelector('dialog');
      if (method === 'Close') await click(dialog.querySelector('.pc-modal-close'));
      else await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(window.location.href, `${base}#metrics`);
      assert.deepEqual(window.history.state.router, { tree: 'preserved' });
    } finally { await cleanup(); }
  });
}

test('malformed or cross-chart query values fail closed without changing unrelated state', async () => {
  for (const item of switches) for (const query of [
    `${item.query}=true`, `${item.query}=`, `${item.query}=${item.id}&${item.query}=${item.id}`,
    `${item.query}=${switches.find(value => value.id !== item.id).id}`,
  ]) {
    const cleanup = await mount(allCharts(), '', initial(`${base}&${query}#${item.slug}`));
    try {
      assert.equal(document.querySelector('dialog [role=switch]').getAttribute('aria-checked'), 'false');
      assert.deepEqual(new URL(window.location.href).searchParams.getAll('ref'), ['a', 'b']);
      assert.deepEqual(window.history.state.router, { tree: 'preserved' });
    } finally { await cleanup(); }
  }
});
