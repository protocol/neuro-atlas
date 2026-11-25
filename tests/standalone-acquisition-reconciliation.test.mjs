import React, { act } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { FieldVelocityRoutes } from '../src/components/field-velocity-routes.tsx';
import { JSDOM } from 'jsdom';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount, click } from './modal-helpers.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import * as pageModule from '../src/app/field-velocity/[slug]/page.tsx';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { readStandaloneChartSettings, standaloneChartParams } from '../src/lib/standalone-chart-state.ts';
import { chartShareUrl } from '../src/lib/chart-export.ts';
import { graphNavigationHref, legacyGraphDestination } from '../src/lib/field-velocity/graph-navigation.ts';

const entry = fieldVelocityGraph('metric-panel-acquisition-economics');
const peer = fieldVelocityGraph('metric-panel-bci-bitrate');
const path = `/proxy/field-velocity/${entry.slug}`;
const selected = 'acquisitionMetric=dollars-per-voxel';

test('acquisition quantity is source-scoped and canonical across legacy and standalone URLs', () => {
  const sources = [path, ...[entry.target, entry.slug, ...entry.aliases].map(alias => `/proxy/field-velocity?${selected}#${alias}`)];
  for (const source of sources) {
    const url = new URL('https://atlas.example' + (source === path ? source + '?' + selected : source));
    const settings = readStandaloneChartSettings(url, entry);
    assert.equal(settings.acquisitionMetric, 'dollars-per-voxel', url.href);
    assert.equal(standaloneChartParams(entry, settings).get('acquisitionMetric'), 'dollars-per-voxel');
    const share = new URL(chartShareUrl(url.href, entry.target));
    assert.equal(share.pathname, path);
    assert.equal(share.search, '?' + selected);
    assert.equal(share.hash, '');
    if (url.hash) {
      const migrated = new URL(legacyGraphDestination(url.href, '/proxy'), url);
      assert.equal(migrated.pathname, path);
      assert.equal(migrated.search, '?' + selected);
    }
  }
  for (const value of ['invalid', '', 'DOLLARS-PER-VOXEL', 'x'.repeat(600), 'dollars-per-voxel&acquisitionMetric=dollars-per-voxel', 'voxels-per-dollar']) {
    const url = new URL(`https://atlas.example${path}?acquisitionMetric=${value}`);
    assert.equal(readStandaloneChartSettings(url, entry).acquisitionMetric, undefined, value);
    assert.equal(new URL(chartShareUrl(url.href, entry.target)).search, '', value);
  }
  const wrong = new URL(`https://atlas.example/proxy/field-velocity/${peer.slug}?${selected}#${entry.slug}`);
  assert.deepEqual(readStandaloneChartSettings(wrong, entry), {});
  assert.equal(new URL(chartShareUrl(wrong.href, entry.target)).search, '');
  const current = `https://atlas.example${path}?tag=a&tag=b&${selected}`;
  assert.equal(new URL(graphNavigationHref(peer.target, current), current).search, '?tag=a&tag=b');
});

test('reciprocal refits retain selected source-efficiency inputs and diagnostics, transforming only display coordinates', async () => {
  const close = await standalone();
  try {
    await click(el('[data-exploration-fit-toggle]'));
    await click(el('[data-exploration-series="Expansion microscopy · estimates"]'));
    const diagnostics = el('[data-exploration-fit-diagnostics]').textContent;
    const fits = () => [...document.querySelectorAll('[data-exploration-fit-line]')].map(node => ({
      label: node.dataset.explorationFitLine, n: node.dataset.fitN,
      points: node.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)),
    }));
    const efficiency = fits();
    assert.equal(efficiency.length, 1, 'remaining EM source points have one eligible fit');
    assert.match(diagnostics, /N=4/);
    await click(el('[data-acquisition-metric=dollars-per-voxel]'));
    assert.equal(el('[data-exploration-fit-diagnostics]').textContent, diagnostics, 'equation and R² remain voxels/$ basis');
    assert.deepEqual(fits(), efficiency.map(fit => ({ ...fit, points: fit.points.map(([x,y]) => [x,y+16]) })), 'same efficiency geometry with main reciprocal header clearance');
    const share = new URL(chartShareUrl(window.location.href, entry.target));
    assert.equal(share.searchParams.get('chartModel'), `${entry.slug}:fit`);
    assert.equal(share.searchParams.get('chartHidden'), `${entry.slug}:expansion`);
    assert.equal(share.searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.equal(el('[data-copy-chart]'), null, 'optional refits remain honestly link-only');
  } finally { await close(); }
});

test('standalone heading and metadata keep the approved neutral title without renaming the published slug', async () => {
  const props = { params: Promise.resolve({ slug: 'estimated-acquisition-efficiency-voxels-per-dollar' }) };
  const page = pageModule.default.default ?? pageModule.default;
  const doc = new JSDOM(renderToStaticMarkup(await page(props)));
  try { assert.equal(doc.window.document.querySelector('h1').textContent, 'Estimated acquisition efficiency'); }
  finally { doc.window.close(); }
  const metadata = await pageModule.generateMetadata(props);
  assert.equal(metadata.title, 'Estimated acquisition efficiency — Neuro Atlas');
  if (metadata.alternates) assert.ok(metadata.alternates.canonical.endsWith('/field-velocity/estimated-acquisition-efficiency-voxels-per-dollar'));
  assert.equal(entry.slug, 'estimated-acquisition-efficiency-voxels-per-dollar');
  for (const alias of entry.aliases) assert.equal(fieldVelocityGraph(alias).slug, entry.slug);
});

test('legacy reciprocal image exports bind captured quantity to its actual rendered SVG', async () => {
  const plot = METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
  const close = await mount(React.createElement(DraftChartPanel, { plot, anchor: entry.target }), '#' + entry.slug);
  try {
    const originalUrl = window.location.href;
    const original = (await whenChartRegistered(entry.target)).getChart();
    await click(el('[data-acquisition-metric=dollars-per-voxel]'));
    const current = window.location.href;
    const selectedSpec = (await whenChartRegistered(entry.target)).getChart();
    const image = buildChartImage(selectedSpec, current);
    assert.equal(new URL(image.url).searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.throws(() => buildChartImage(original, current), /state changed|not ready/);
    assert.throws(() => buildChartImage(selectedSpec, originalUrl), /state changed|not ready/);
    await click(el('[data-acquisition-metric=voxels-per-dollar]'));
    assert.throws(() => buildChartImage(selectedSpec, current), /state changed|not ready/);
  } finally { await close(); }
});

globalThis.React = React;
const el = selector => document.querySelector(selector);
const chosen = () => el('[data-acquisition-metric][aria-pressed=true]')?.dataset.acquisitionMetric;
const chart = () => el('svg.draft-plot-svg');
async function standalone(search = '') {
  return mount(React.createElement(AppRouterContext.Provider, { value: { replace() { assert.fail('unexpected navigation'); } } },
    React.createElement(FieldVelocityRoutes, null, React.createElement(FieldVelocityGraphDetail, { entry }))), '', win => {
    win.history.replaceState({ __NA: true, tree: ['retained'] }, '', path + search);
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  });
}
async function travel(direction) {
  await act(async () => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no history event')), 2000);
      window.addEventListener('popstate', () => { clearTimeout(timer); resolve(); }, { once: true });
      window.history[direction]();
    });
  });
}
const evidence = () => ({
  values: [...chart().querySelectorAll('[data-source-observation]')].map(node => [node.dataset.sourceObservation, node.dataset.acquisitionValue, node.getAttribute('cx'), node.getAttribute('cy'), node.getAttribute('points')]),
  ticks: [...chart().querySelectorAll('[data-acquisition-y-tick]')].map(node => node.textContent),
  title: el('figcaption').textContent,
});
test('actual standalone unit controls clear incompatible reference and share exact rendered state across history and fresh documents', async () => {
  let copied;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { copied = text; } } });
  let close = await standalone(`?tag=a&tag=b&secret=private&chartModel=${entry.slug}:brain-scale`);
  let expected, shared;
  try {
    const oldUrl = window.location.href;
    const state = window.history.state;
    const sourceTable = el('table').outerHTML;
    const sourceJson = el('[data-source-plot-json]').href;
    assert.deepEqual(JSON.parse(decodeURIComponent(sourceJson.split(',')[1])),
      METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0], 'neutral page title must not rewrite the original source JSON');
    const oldSpec = (await whenChartRegistered(entry.target)).getChart();
    assert.equal(chosen(), 'voxels-per-dollar');
    assert.equal(el('[data-brain-scale-toggle]').getAttribute('aria-checked'), 'true');
    const cost = el('[data-acquisition-metric=dollars-per-voxel]');
    cost.focus();
    await click(cost);
    const current = new URL(window.location.href);
    assert.equal(current.pathname, path);
    assert.equal(current.hash, '', 'standalone controls must not reintroduce the modal hash');
    assert.equal(current.searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.equal(current.searchParams.has('chartModel'), false, 'cost clears typed brain-scale state');
    assert.equal(current.searchParams.has('brainScale'), false);
    assert.equal(el('[data-brain-scale-toggle]'), null);
    assert.equal(el('[data-brain-scale-reference]'), null);
    assert.equal(chosen(), 'dollars-per-voxel');
    assert.ok(document.activeElement === cost);
    assert.deepEqual(window.history.state, state);
    assert.deepEqual(current.searchParams.getAll('tag'), ['a', 'b']);
    assert.equal(el('table').outerHTML, sourceTable);
    assert.equal(el('[data-source-plot-json]').href, sourceJson);
    const data = JSON.parse(decodeURIComponent(el('[data-selected-plot-json]').getAttribute('href').split(',')[1]));
    assert.equal(data.acquisitionView.metric, 'dollars-per-voxel');
    assert.equal(data.acquisitionView.fitBasis, 'voxels/$');
    expected = evidence();
    assert.throws(() => buildChartImage(oldSpec, window.location.href), /state changed|not ready/);
    const selectedSpec = (await whenChartRegistered(entry.target)).getChart();
    const image = buildChartImage(selectedSpec, window.location.href);
    assert.equal(new URL(image.url).searchParams.get('acquisitionMetric'), 'dollars-per-voxel');
    assert.throws(() => buildChartImage(selectedSpec, oldUrl), /state changed|not ready/);
    const output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    try { assert.ok(output.window.document.documentElement.textContent.includes(image.url)); } finally { output.window.close(); }
    await click(el('[data-copy-draft-link]'));
    shared = new URL(copied);
    assert.equal(shared.pathname, path);
    assert.equal(shared.search, '?' + selected + `&utm_source=neuro_atlas&utm_medium=share&utm_campaign=chart_share&utm_content=${entry.slug}`);
    assert.equal(shared.hash, '');
    assert.equal(window.location.href, current.href, 'Copy never navigates or rewrites sender queries');
    assert.deepEqual(window.history.state, state);
    await travel('back');
    assert.equal(chosen(), 'voxels-per-dollar');
    assert.equal(el('[data-brain-scale-toggle]').getAttribute('aria-checked'), 'true');
    await travel('forward');
    assert.deepEqual(evidence(), expected);
    await click(el('[data-acquisition-metric=voxels-per-dollar]'));
    assert.equal(new URL(window.location.href).searchParams.has('acquisitionMetric'), false);
    assert.equal(el('[data-brain-scale-toggle]').getAttribute('aria-checked'), 'false', 'switching back does not revive reference');
  } finally { await close(); }
  // Fresh mount, then a second document models a reload of the canonical link.
  for (let i = 0; i < 2; i++) {
    close = await standalone(shared.search);
    try { assert.equal(chosen(), 'dollars-per-voxel'); assert.deepEqual(evidence(), expected); }
    finally { await close(); }
  }
  const legacy = `https://atlas.example/proxy/field-velocity?${selected}&brainScale=acquisition-economics#draft-panel-acquisition-economics`;
  const migrated = new URL(legacyGraphDestination(legacy, '/proxy'), legacy);
  close = await standalone(migrated.search);
  try { assert.equal(chosen(), 'dollars-per-voxel'); assert.equal(el('[data-brain-scale-toggle]'), null); }
  finally { await close(); }
});
